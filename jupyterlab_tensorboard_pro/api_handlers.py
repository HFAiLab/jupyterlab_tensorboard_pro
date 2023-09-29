# -*- coding: utf-8 -*-

import json
import os
import logging

from tornado import web
from jupyter_server.base.handlers import APIHandler

from .handlers import notebook_dir


def _trim_notebook_dir(dir, enable_multi_log):
    if dir.startswith("s3://"):
        return dir
    if enable_multi_log:
        return dir
    if ':' not in dir and not dir.startswith("/"):
        return os.path.join(
            "<notebook_dir>", os.path.relpath(dir, notebook_dir)
        )
    return dir


class TbRootConfigHandler(APIHandler):

    @web.authenticated
    def get(self):
        terms = {
            'notebook_dir': notebook_dir,
        }
        self.finish(json.dumps(terms))


class TbRootHandler(APIHandler):

    @web.authenticated
    def get(self):
        terms = [
            {
                'name': entry.name,
                'reload_interval': entry.reload_interval,
                'enable_multi_log': entry.enable_multi_log,
                'logdir': _trim_notebook_dir(entry.logdir, entry.enable_multi_log),
                'additional_args': entry.additional_args,
            } for entry in
            self.settings["tensorboard_manager"].values()
        ]
        self.finish(json.dumps(terms))

    @web.authenticated
    def post(self):
        try:
            data = self.get_json_body()
            reload_interval = data.get("reload_interval", None)
            enable_multi_log = data.get("enable_multi_log", False)
            additional_args = data.get("additional_args", '')
            entry = (
                self.settings["tensorboard_manager"]
                .new_instance(data["logdir"], reload_interval=reload_interval, enable_multi_log=enable_multi_log, additional_args=additional_args)
            )
            self.finish(json.dumps({
                'name': entry.name,
                'reload_interval': entry.reload_interval,
                'enable_multi_log': entry.enable_multi_log,
                'additional_args': entry.additional_args,
                'logdir':  _trim_notebook_dir(entry.logdir, entry.enable_multi_log),
            }))
        except SystemExit:
            logging.error("[Tensorboard Error] mostly parse args error")
            raise web.HTTPError(
                500, "Tensorboard Error: mostly parse args error")
        except Exception as e:
            logging.error("[Tensorboard Error] catch exception: {e}")
            print('[Tensorboard Error]', e)


class TbInstanceHandler(APIHandler):

    SUPPORTED_METHODS = ('GET', 'DELETE')

    @web.authenticated
    def get(self, name):
        manager = self.settings["tensorboard_manager"]
        if name in manager:
            entry = manager[name]
            self.finish(json.dumps({
                'name': entry.name,
                'reload_interval': entry.reload_interval,
                'enable_multi_log': entry.enable_multi_log,
                'logdir':  _trim_notebook_dir(entry.logdir, entry.enable_multi_log),
            }))
        else:
            raise web.HTTPError(
                404, "TensorBoard instance not found: %r" % name)

    @web.authenticated
    def delete(self, name):
        manager = self.settings["tensorboard_manager"]
        if name in manager:
            manager.terminate(name, force=True)
            self.set_status(204)
            self.finish()
        else:
            raise web.HTTPError(
                404, "TensorBoard instance not found: %r" % name)
