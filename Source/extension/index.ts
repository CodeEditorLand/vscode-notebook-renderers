// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import {
	Event,
	EventEmitter,
	ExtensionContext,
	extensions,
	NotebookEditor,
	notebooks,
} from "vscode";

import {
	IsJupyterExtensionInstalled,
	OpenImageInPlotViewer,
	SaveImageAs,
} from "./constants";

export async function activate(context: ExtensionContext): Promise<{
	onDidReceiveMessage: Event<{
		editor: NotebookEditor;

		message: OpenImageInPlotViewer | SaveImageAs;
	}>;
}> {
	const onDidReceiveMessage = new EventEmitter<{
		editor: NotebookEditor;

		message: OpenImageInPlotViewer | SaveImageAs;
	}>();

	const messaging = notebooks.createRendererMessaging(
		"jupyter-notebook-renderer",
	);

	context.subscriptions.push(
		messaging.onDidReceiveMessage(({ editor, message }) => {
			const msg = message as
				| OpenImageInPlotViewer
				| SaveImageAs
				| IsJupyterExtensionInstalled;

			if (!msg.type) {
				return;
			}

			if (msg.type === "isJupyterExtensionInstalled") {
				void messaging
					.postMessage(
						<IsJupyterExtensionInstalled>{
							type: "isJupyterExtensionInstalled",
							response:
								!!extensions.getExtension("ms-toolsai.jupyter"),
						},
						editor,
					)
					.then(
						() => {
							/* noop */
						},
						(ex) => console.error("Failed to send", ex),
					);

				return;
			}

			onDidReceiveMessage.fire({ editor, message: msg });
		}),
	);

	messaging.postMessage(<IsJupyterExtensionInstalled>{
		type: "isJupyterExtensionInstalled",
		response: !!extensions.getExtension("ms-toolsai.jupyter"),
	});

	return {
		onDidReceiveMessage: onDidReceiveMessage.event,
	};
}
