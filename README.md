# Jupyterlab-TensorBoard-Pro

![Github Actions Status](https://github.com/HFAiLab/jupyterlab_tensorboard_pro/workflows/Build/badge.svg)&nbsp;![pypi](https://img.shields.io/pypi/v/jupyterlab_tensorboard_pro.svg)

[中文文档](./README.zh-cn.md)

A TensorBoard Jupyterlab plugin.

![](./images/tensorboard.step4.png)

## Requirements

**python >= 3.6**

Please install the following dependencies before installing this project:

- jupyterlab
- tensorflow
- tensorboard

## Install

```
pip install jupyterlab-tensorboard-pro
```

> only jupyterlab support, not include notebook

## Background

In fact, there are already [jupyterlab_tensorboard](https://github.com/chaoleili/jupyterlab_tensorboard) (front-end plugin) and [jupyter_tensorboard](https://github.com/lspvic/jupyter_tensorboard) (corresponding back-end plugin) in the community. side plugin), but both repositories have not been updated for a long time, and some new repair PRs have not been merged in time. Based on this, it is judged that the project author is no longer actively maintaining the corresponding repositories.

At the same time, the existing community TensorBoard plugin has certain experience problems, such as installing two python packages at the same time, no response for a long time after clicking `TensorBoard`, the TensorBoard Reload time cannot be set. The interactive experience is not friendly enough, which will also affect the user's Jupyterlab experience.

Therefore, this project is forked from the existing projects of the community, makes changes to the logic, and refers to some previous PRs that are more helpful but have not been incorporated for the time being, and will to be maintained for a long time in the future.

Special thanks to the developers of the previous related repositories.

## Instructions

### Create instance

#### Create from launcher panel

We can click on the TensorBoard icon from the Launcher panel, the first click will take you to a default initialization panel from which we can create a TensorBoard instance. Non-first entry will directly enter the first active TensorBoard instance.

![](./images/tensorboard.step1.png)

#### Created by shortcut command

We can also type `Open TensorBoard` in the JupyterLab shortcut panel (evoked by `ctrl + shift + c`)

![](./images/tensorboard.step2.png)

#### Parameters

In the initialization panel, two parameters are provided:

- **Log Dir**: The default is the directory of the current sidebar when TensorBoard is clicked. You can also manually fill in the corresponding directory. It is recommended to make the directory as detailed as possible. If the directory content is small, the initialization speed will be improved.
- **Reload Interval**: How often does TensorBoard backend rescan the corresponding directory. This option is disabled by default. It is recommended to use manually Reload for daily use (The continuous scanning of directories by the TensorBoard backend will have a certain impact on Jupyter's stability and file system).

Select the parameters and click Create TensorBoard, and the TensorBoard instance will be created synchronously. At this time, the jupyter backend is **blocking**, please wait for the instance to be created before performing other operations.
![](./images/tensorboard.step3.png)

### Manage instances

After the instance is created, we can manage the instance of TensorBoard. Currently, the following functions are provided:

- **Refresh and list switching**: TensorBoard backends that can be switched to other instances will not be destroyed at this time.
- **Open in a separate page**: You can open TensorBoard in the form of a separate web page Tab.
- **Reload**: Reinitialize the TensorBoard backend. When the content of the file is updated, you can load the new content through this function (Note: The refresh inside TensorBoard will not cause Reload).
- **Destroy**: Destroy the instance, it will close together with the front panel.
- **Duplicate**: reopen an identical frontend panel, this operation will reuse the TensorBoard backend.
- **New**: Create an additional TensorBoard backend, please refer to the first part for precautions.

In addition, for the TensorBoard instance we created, it can be managed together in the Kernel management panel of Jupyter, providing functions such as jumping to the corresponding instance and deleting.

## Develop

```shell
jlpm install
jlpm run install:client
jlpm run install:server
# after above maybe you need to use a soft link
```

build

```
python setup.py bdist_wheel --universal
```
