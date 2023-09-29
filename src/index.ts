import { JupyterFrontEnd, JupyterFrontEndPlugin } from '@jupyterlab/application';
import {
  ICommandPalette,
  WidgetTracker,
  IWidgetTracker,
  showDialog,
  Dialog,
  MainAreaWidget
} from '@jupyterlab/apputils';
import { ILauncher } from '@jupyterlab/launcher';
import { IMainMenu } from '@jupyterlab/mainmenu';
import { FileBrowser, IFileBrowserFactory } from '@jupyterlab/filebrowser';
import { TensorboardManager } from './manager';
import { Tensorboard } from './tensorboard';
import { IRunningSessionManagers, IRunningSessions } from '@jupyterlab/running';
import { LabIcon } from '@jupyterlab/ui-components';
import tensorboardSvgStr from '../style/tensorboard.svg';
import { TensorboardTabReactWidget } from './biz/widget';
import { CommandIDs } from './commands';

export const tensorboardIcon = new LabIcon({
  name: 'jupyterlab-tensorboard-p:tensorboard',
  svgstr: tensorboardSvgStr
});

/**
 * Initialization data for the tensorboard extension.
 */
const extension: JupyterFrontEndPlugin<IWidgetTracker<MainAreaWidget<TensorboardTabReactWidget>>> =
  {
    id: 'tensorboard',
    requires: [ICommandPalette, IFileBrowserFactory],
    optional: [ILauncher, IMainMenu, IRunningSessionManagers],
    autoStart: true,
    activate
  };

export default extension;

async function activate(
  app: JupyterFrontEnd,
  palette: ICommandPalette,
  browserFactory: IFileBrowserFactory,
  launcher: ILauncher | null,
  menu: IMainMenu | null,
  runningSessionManagers: IRunningSessionManagers | null
): Promise<WidgetTracker<MainAreaWidget<TensorboardTabReactWidget>>> {
  console.info('activate beign test!!');
  const manager = new TensorboardManager();
  const namespace = 'tensorboard';
  const tracker = new WidgetTracker<MainAreaWidget<TensorboardTabReactWidget>>({
    namespace
  });

  const fileBrowser = browserFactory.createFileBrowser('tensorboard_pro');
  addCommands(app, manager, tracker, fileBrowser, launcher, menu);

  if (runningSessionManagers) {
    await addRunningSessionManager(runningSessionManagers, app, manager);
  }

  palette.addItem({ command: CommandIDs.inputDirect, category: 'Tensorboard' });

  return tracker;
}

// Running Kernels and Terminals，The coin-like tab
function addRunningSessionManager(
  managers: IRunningSessionManagers,
  app: JupyterFrontEnd,
  manager: TensorboardManager
) {
  class RunningTensorboard implements IRunningSessions.IRunningItem {
    manager: TensorboardManager;

    constructor(model: Tensorboard.IModel, manager: TensorboardManager) {
      this._model = model;
      this.manager = manager;
    }
    open() {
      app.commands.execute(CommandIDs.open, { modelName: this._model.name });
    }
    icon() {
      return tensorboardIcon;
    }
    label() {
      return `${this._model.name}:${this.manager.formatDir(this._model.logdir)}`;
    }
    shutdown() {
      app.commands.execute(CommandIDs.close, { tb: this._model });
      return manager.shutdown(this._model.name);
    }

    private _model: Tensorboard.IModel;
  }

  return manager.getStaticConfigPromise.then(() => {
    managers.add({
      name: 'Tensorboard',
      running: () => manager.running().map(model => new RunningTensorboard(model, manager)),
      shutdownAll: () => manager.shutdownAll(),
      refreshRunning: () => manager.refreshRunning(),
      runningChanged: manager.runningChanged
    });
  });
}

/**
 * Add the commands for the tensorboard.
 */
export function addCommands(
  app: JupyterFrontEnd,
  manager: TensorboardManager,
  tracker: WidgetTracker<MainAreaWidget<TensorboardTabReactWidget>>,
  fileBrowser: FileBrowser,
  launcher: ILauncher | null,
  menu: IMainMenu | null
): void {
  const { commands, serviceManager } = app;

  commands.addCommand(CommandIDs.open, {
    execute: args => {
      // if select certain

      let modelName = args['modelName'] as string | undefined;
      const copy = args['copy'];
      console.info('[DEBUG] browserFactory.defaultBrowser:', fileBrowser, fileBrowser.model.path);

      const currentCWD = fileBrowser.model.path;

      let widget: MainAreaWidget<TensorboardTabReactWidget> | null | undefined = null;

      // step1: find an opened widget
      if (!modelName) {
        widget = tracker.find(widget => {
          return (
            manager.formatDir(widget.content.currentLogDir || '') === manager.formatDir(currentCWD)
          );
        });
      } else if (!copy) {
        widget = tracker.find(value => {
          return value.content.currentTensorBoardModel?.name === modelName;
        });
      }
      // default we have only one tensorboard
      if (widget) {
        app.shell.activateById(widget.id);
        return widget;
      } else {
        // step2: try find opened backend widgets
        if (!modelName) {
          const runningTensorboards = [...manager.running()];
          // hint: Using runningTensorboards directly may cause setState to fail to respond
          for (const model of runningTensorboards) {
            if (manager.formatDir(model.logdir) === manager.formatDir(currentCWD)) {
              modelName = model.name;
            }
          }
        }

        const tabReact = new TensorboardTabReactWidget({
          fileBrowser,
          tensorboardManager: manager,
          app,
          createdModelName: modelName
        });
        const tabWidget = new MainAreaWidget({ content: tabReact });
        tracker.add(tabWidget);
        app.shell.add(tabWidget, 'main', {
          mode: copy ? 'split-right' : undefined
        });
        app.shell.activateById(tabWidget.id);
        return tabWidget;
      }
    }
  });

  commands.addCommand(CommandIDs.openDoc, {
    execute: args => {
      window.open('https://github.com/HFAiLab/jupyterlab_tensorboard_pro');
    }
  });

  commands.addCommand(CommandIDs.close, {
    execute: args => {
      const model = args['tb'] as Tensorboard.IModel;
      tracker.forEach(widget => {
        if (
          widget.content.currentTensorBoardModel &&
          widget.content.currentTensorBoardModel.name === model.name
        ) {
          widget.dispose();
          widget.close();
        }
      });
    }
  });

  commands.addCommand(CommandIDs.inputDirect, {
    label: () => 'Open TensorBoard',
    execute: args => {
      return app.commands.execute(CommandIDs.open);
    }
  });

  commands.addCommand(CommandIDs.createNew, {
    label: args => (args['isPalette'] ? 'New TensorBoard' : 'TensorBoard'),
    caption: 'Start a new tensorboard',
    icon: args => (args['isPalette'] ? undefined : tensorboardIcon),
    execute: args => {
      const cwd = (args['cwd'] as string) || fileBrowser.model.path;
      const logdir = typeof args['logdir'] === 'undefined' ? cwd : (args['logdir'] as string);
      return serviceManager.contents.get(logdir, { type: 'directory' }).then(
        dir => {
          // Try to open the session panel to make it easier for users to observe more active tensorboard instances
          try {
            app.shell.activateById('jp-running-sessions');
          } catch (e) {
            // do nothing
          }
          app.commands.execute(CommandIDs.open);
        },
        () => {
          // no such directory.
          return showDialog({
            title: 'Cannot create tensorboard.',
            body: 'Directory not found',
            buttons: [Dialog.okButton()]
          });
        }
      );
    }
  });

  if (launcher) {
    launcher.add({
      command: CommandIDs.createNew,
      category: 'Other',
      rank: 2
    });
  }

  if (menu) {
    menu.fileMenu.newMenu.addGroup(
      [
        {
          command: CommandIDs.createNew
        }
      ],
      30
    );
  }
}
