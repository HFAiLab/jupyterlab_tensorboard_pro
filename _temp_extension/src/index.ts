import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { requestAPI } from './handler';

/**
 * Initialization data for the jupyterlab_tensorboard_pro extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab_tensorboard_pro:plugin',
  description: 'A JupyterLab extension for tensorboard.',
  autoStart: true,
  activate: (app: JupyterFrontEnd) => {
    console.log('JupyterLab extension jupyterlab_tensorboard_pro is activated!');

    requestAPI<any>('get-example')
      .then(data => {
        console.log(data);
      })
      .catch(reason => {
        console.error(
          `The jupyterlab_tensorboard_pro server extension appears to be missing.\n${reason}`
        );
      });
  }
};

export default plugin;
