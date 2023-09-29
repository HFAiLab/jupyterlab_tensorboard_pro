import { each, map, toArray } from '@lumino/algorithm';
import { IDisposable } from '@lumino/disposable';
import { JSONObject } from '@lumino/coreutils';
import { URLExt } from '@jupyterlab/coreutils';
import { Signal, ISignal } from '@lumino/signaling';
import { ServerConnection } from '@jupyterlab/services';

/**
 * The url for the tensorboard service. tensorboard
 * service provided by jupyter_tensorboard.
 * ref: https://github.com/lspvic/jupyter_tensorboard
 * Maybe rewrite the jupyter_tensorboard service by myself.
 */
const TENSORBOARD_SERVICE_URL = 'api/tensorboard_pro';

const TENSORBOARD_STATIC_CONFIG_URL = 'api/tensorboard_pro_static_config';

const TENSORBOARD_URL = 'tensorboard_pro';

/**
 * The namespace for Tensorboard statics.
 */
export namespace Tensorboard {
  /**
   * An interface for a tensorboard.
   */
  export interface ITensorboard extends IDisposable {
    /**
     * A signal emitted when the tensorboard is shut down.
     */
    terminated: ISignal<ITensorboard, void>;

    /**
     * The model associated with the tensorboard.
     */
    readonly model: IModel;

    /**
     * Get the name of the tensorboard.
     */
    readonly name: string;

    /**
     * The server settings for the tensorboard.
     */
    readonly serverSettings: ServerConnection.ISettings;

    /**
     * Shut down the tensorboard.
     */
    shutdown(): Promise<void>;
  }

  /**
   * Start a new tensorboard.
   *
   * @param options - The tensorboard options to use.
   *
   * @returns A promise that resolves with the tensorboard instance.
   */
  export function startNew(
    logdir: string,
    refreshInterval: number,
    enableMultiLog: boolean,
    additionalArgs: string,
    options?: IOptions
  ): Promise<ITensorboard> {
    return DefaultTensorboard.startNew(
      logdir,
      refreshInterval,
      enableMultiLog,
      additionalArgs,
      options
    );
  }

  export function getStaticConfig(settings?: ServerConnection.ISettings): Promise<StaticConfig> {
    return DefaultTensorboard.getStaticConfig(settings);
  }

  /**
   * List the running tensorboards.
   *
   * @param settings - The server settings to use.
   *
   * @returns A promise that resolves with the list of running tensorboard models.
   */
  export function listRunning(settings?: ServerConnection.ISettings): Promise<IModel[]> {
    return DefaultTensorboard.listRunning(settings);
  }

  /**
   * Shut down a tensorboard by name.
   *
   * @param name - The name of the target tensorboard.
   *
   * @param settings - The server settings to use.
   *
   * @returns A promise that resolves when the tensorboard is shut down.
   */
  export function shutdown(name: string, settings?: ServerConnection.ISettings): Promise<void> {
    return DefaultTensorboard.shutdown(name, settings);
  }

  /**
   * Shut down all tensorboard.
   *
   * @returns A promise that resolves when all of the tensorboards are shut down.
   */
  export function shutdownAll(settings?: ServerConnection.ISettings): Promise<void> {
    return DefaultTensorboard.shutdownAll(settings);
  }

  /**
   * Get tensorboard's url
   */
  export function getUrl(name: string, settings?: ServerConnection.ISettings): string {
    return DefaultTensorboard.getUrl(name, settings);
  }

  /**
   * The options for intializing a tensorboard object.
   */
  export interface IOptions {
    /**
     * The server settings for the tensorboard.
     */
    serverSettings?: ServerConnection.ISettings;
  }

  /**
   * The server model for a tensorboard.
   */
  export interface IModel extends JSONObject {
    /**
     * The name of the tensorboard.
     */
    readonly name: string;

    /**
     * The logdir Path of the tensorboard.
     */
    readonly logdir: string;

    /**
     * The reload interval of the tensorboard.
     */
    readonly reload_interval: number;

    /**
     * The last reload time of the tensorboard.
     */
    readonly reload_time: string;

    /**
     * Whether to support multiple log parameters to be passed in, the `logdir_spec` of tensorboard will actually be used internally
     */
    readonly enable_multi_log: boolean;

    /**
     * additional args to tensorboard
     */
    readonly additional_args: string;
  }

  export interface StaticConfig extends JSONObject {
    /**
     * The name of the tensorboard.
     */
    readonly notebook_dir: string;
  }

  /**
   * The interface for a tensorboard manager.
   *
   * The manager is respoonsible for maintaining the state of running
   * tensorboard.
   */
  export interface IManager extends IDisposable {
    readonly serverSettings: ServerConnection.ISettings;

    runningChanged: ISignal<this, IModel[]>;

    running(): Array<IModel>;

    startNew(
      logdir: string,
      refreshInterval: number,
      enableMultiLog: boolean,
      additionalArgs: string,
      options?: IOptions
    ): Promise<ITensorboard>;

    shutdown(name: string): Promise<void>;

    shutdownAll(): Promise<void>;

    refreshRunning(): Promise<void>;
  }
}

export class DefaultTensorboard implements Tensorboard.ITensorboard {
  /**
   * Construct a new tensorboard.
   */
  constructor(
    name: string,
    logdir: string,
    lastReload: string,
    reloadInterval: number | undefined,
    enableMultiLog: boolean | undefined,
    additionalArgs: string | undefined,
    options: Tensorboard.IOptions = {}
  ) {
    this._name = name;
    this._logdir = logdir;
    this._lastReload = lastReload;
    this._reloadInterval = reloadInterval;
    this._enableMultiLog = Boolean(enableMultiLog);
    this._additionalArgs = additionalArgs || '';
    this.serverSettings = options.serverSettings || ServerConnection.makeSettings();
    this._url = Private.getTensorboardInstanceUrl(this.serverSettings.baseUrl, this._name);
  }

  /**
   * Get the name of the tensorboard.
   */
  get name(): string {
    return this._name;
  }

  /**
   * Get the model for the tensorboard.
   */
  get model(): Tensorboard.IModel {
    return {
      name: this._name,
      logdir: this._logdir,
      reload_time: this._lastReload,
      reload_interval: this._reloadInterval || 0,
      enable_multi_log: this._enableMultiLog || false,
      additional_args: this._additionalArgs || ''
    };
  }

  /**
   * A signal emitted when the tensorboard is shut down.
   */
  get terminated(): Signal<this, void> {
    return this._terminated;
  }

  /**
   * Test whether the tensorbaord is disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Dispose of the resources held by the tensorboard.
   */
  dispose(): void {
    if (this._isDisposed) {
      return;
    }

    this.terminated.emit(void 0);
    this._isDisposed = true;
    delete Private.running[this._url];
    Signal.clearData(this);
  }

  /**
   * The server settings for the tensorboard.
   */
  readonly serverSettings: ServerConnection.ISettings;

  /**
   * Shut down the tensorboard.
   */
  shutdown(): Promise<void> {
    const { name, serverSettings } = this;
    return DefaultTensorboard.shutdown(name, serverSettings);
  }

  private _isDisposed = false;
  private _url: string;
  private _name: string;
  private _logdir: string;
  private _lastReload: string;
  private _reloadInterval: number | undefined;
  private _enableMultiLog: boolean;
  private _additionalArgs: string;
  private _terminated = new Signal<this, void>(this);
}

/**
 * The static namespace for `DefaultTensorboard`.
 */
export namespace DefaultTensorboard {
  /**
   * Start a new tensorboard.
   *
   * @param options - The tensorboard options to use.
   *
   * @returns A promise that resolves with the tensorboard instance.
   */
  export function startNew(
    logdir: string,
    refreshInterval: number,
    enableMultiLog: boolean,
    additionalArgs: string,
    options: Tensorboard.IOptions = {}
  ): Promise<Tensorboard.ITensorboard> {
    const serverSettings = options.serverSettings || ServerConnection.makeSettings();
    const url = Private.getServiceUrl(serverSettings.baseUrl);
    // ServerConnection won't automaticy add this header when the body in not none.
    const header = new Headers({ 'Content-Type': 'application/json' });

    const data = JSON.stringify({
      logdir: logdir,
      reload_interval: refreshInterval,
      enable_multi_log: enableMultiLog,
      additional_args: additionalArgs
    });

    const init = { method: 'POST', headers: header, body: data };

    return ServerConnection.makeRequest(url, init, serverSettings)
      .then(response => {
        if (response.status !== 200) {
          throw new ServerConnection.ResponseError(response);
        }
        return response.json();
      })
      .then((data: Tensorboard.IModel) => {
        const name = data.name;
        const logdir = data.logdir;
        const lastReload = data.reload_time;
        const reloadInterval = data.reload_interval;
        const enableMultiLog = data.enable_multi_log;
        const additionalArgs = data.additional_args;
        return new DefaultTensorboard(
          name,
          logdir,
          lastReload,
          reloadInterval,
          enableMultiLog,
          additionalArgs,
          {
            ...options,
            serverSettings
          }
        );
      });
  }

  export function getStaticConfig(
    settings?: ServerConnection.ISettings
  ): Promise<Tensorboard.StaticConfig> {
    const statis_config_url = Private.getTensorboardStaticConfigUrl(settings!.baseUrl);
    return ServerConnection.makeRequest(statis_config_url, {}, settings!)
      .then(response => {
        if (response.status !== 200) {
          throw new ServerConnection.ResponseError(response);
        }
        return response.json();
      })
      .then((data: Tensorboard.StaticConfig) => {
        return data;
      });
  }

  /**
   * List the running tensorboards.
   *
   * @param settings - The server settings to use.
   *
   * @returns A promise that resolves with the list of running tensorboard models.
   */
  export function listRunning(
    settings?: ServerConnection.ISettings
  ): Promise<Tensorboard.IModel[]> {
    settings = settings || ServerConnection.makeSettings();
    const service_url = Private.getServiceUrl(settings.baseUrl);
    const instance_url = Private.getTensorboardInstanceRootUrl(settings.baseUrl);
    return ServerConnection.makeRequest(service_url, {}, settings)
      .then(response => {
        if (response.status !== 200) {
          throw new ServerConnection.ResponseError(response);
        }
        return response.json();
      })
      .then((data: Tensorboard.IModel[]) => {
        if (!Array.isArray(data)) {
          throw new Error('Invalid tensorboard data');
        }
        // Update the local data store.
        const urls = toArray(
          map(data, item => {
            return URLExt.join(instance_url, item.name);
          })
        );
        each(Object.keys(Private.running), runningUrl => {
          if (urls.indexOf(runningUrl) === -1) {
            const tensorboard = Private.running[runningUrl];
            tensorboard.dispose();
          }
        });
        return data;
      });
  }

  /**
   * Shut down a tensorboard by name.
   *
   * @param name - Then name of the target tensorboard.
   *
   * @param settings - The server settings to use.
   *
   * @returns A promise that resolves when the tensorboard is shut down.
   */
  export function shutdown(name: string, settings?: ServerConnection.ISettings): Promise<void> {
    settings = settings || ServerConnection.makeSettings();
    const url = Private.getTensorboardUrl(settings.baseUrl, name);
    const init = { method: 'DELETE' };
    return ServerConnection.makeRequest(url, init, settings).then(response => {
      if (response.status === 404) {
        return response.json().then(data => {
          Private.killTensorboard(url);
        });
      }
      if (response.status !== 204) {
        throw new ServerConnection.ResponseError(response);
      }
      Private.killTensorboard(url);
    });
  }

  /**
   * Shut down all tensorboards.
   *
   * @param settings - The server settings to use.
   *
   * @returns A promise that resolves when all the tensorboards are shut down.
   */
  export function shutdownAll(settings?: ServerConnection.ISettings): Promise<void> {
    settings = settings || ServerConnection.makeSettings();
    return listRunning(settings).then(running => {
      each(running, s => {
        shutdown(s.name, settings);
      });
    });
  }

  /**
   * According tensorboard's name to get tensorboard's url.
   */
  export function getUrl(name: string, settings?: ServerConnection.ISettings): string {
    settings = settings || ServerConnection.makeSettings();
    return Private.getTensorboardInstanceUrl(settings.baseUrl, name);
  }
}

/**
 * A namespace for private data.
 */
namespace Private {
  /**
   * A mapping of running tensorboards by url.
   */
  export const running: { [key: string]: DefaultTensorboard } = Object.create(null);

  /**
   * Get the url for a tensorboard.
   */
  export function getTensorboardUrl(baseUrl: string, name: string): string {
    return URLExt.join(baseUrl, TENSORBOARD_SERVICE_URL, name);
  }

  /**
   * Get the url for a tensorboard.
   */
  export function getTensorboardStaticConfigUrl(baseUrl: string): string {
    return URLExt.join(baseUrl, TENSORBOARD_STATIC_CONFIG_URL);
  }

  /**
   * Get the base url.
   */
  export function getServiceUrl(baseUrl: string): string {
    return URLExt.join(baseUrl, TENSORBOARD_SERVICE_URL);
  }

  /**
   * Kill tensorboard by url.
   */
  export function killTensorboard(url: string): void {
    // Update the local data store.
    if (Private.running[url]) {
      const tensorboard = Private.running[url];
      tensorboard.dispose();
    }
  }

  export function getTensorboardInstanceRootUrl(baseUrl: string): string {
    return URLExt.join(baseUrl, TENSORBOARD_URL);
  }

  export function getTensorboardInstanceUrl(baseUrl: string, name: string): string {
    return URLExt.join(baseUrl, TENSORBOARD_URL, name);
  }
}
