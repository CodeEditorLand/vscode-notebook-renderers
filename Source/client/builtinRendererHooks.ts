import type { OutputItem, RendererContext } from "vscode-notebook-renderer";

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// This must be on top, do not change. Required by webpack.
// eslint-disable-next-line no-unused-vars
declare let __webpack_public_path__: string;
declare const scriptUrl: string;

const getPublicPath = () => {
	return new URL(scriptUrl.replace(/[^/]+$/, "")).toString();
};

// eslint-disable-next-line prefer-const, no-unused-vars, @typescript-eslint/no-unused-vars
__webpack_public_path__ = getPublicPath();

if (!("$" in globalThis) && !("jQuery" in globalThis)) {
	// Required by JS code.
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const jQuery = require("jquery");
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	(globalThis as any).$ = jQuery;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	(globalThis as any).jQuery = jQuery;
}
export async function activate(ctx: RendererContext<void>) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const builtinRenderer = await ctx.getRenderer("vscode.builtin-renderer");

	if (!builtinRenderer) {
		throw new Error("Could not find the built-in js renderer");
	}

	try {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(builtinRenderer.experimental_registerHtmlRenderingHook as any)({
			async postRender(
				_outputItem: OutputItem,
				element: HTMLElement,
				_signal: AbortSignal,
			): Promise<undefined> {
				// Output container is expected to have the class `output_html`
				element.classList.add("output_html");

				return;
			},
		});
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(builtinRenderer.experimental_registerJavaScriptRenderingHook as any)({
			async preEvaluate(
				outputItem: OutputItem,
				element: HTMLElement,
				script: string,
				_signal: AbortSignal,
			): Promise<string | undefined> {
				if (ctx.postMessage) {
					ctx.postMessage({
						type: "from Renderer",
						payload: "Hello World",
					});
				}

				const metadata =
					outputItem.metadata &&
					typeof outputItem.metadata === "object" &&
					"metadata" in outputItem.metadata
						? // eslint-disable-next-line @typescript-eslint/no-explicit-any
							(outputItem.metadata as any)["metadata"]
						: undefined;

				return `
                (function(){
                    let gotToUserScript = false;

                    try {
                        // Required by JS code in Jupyter notebook renderers such as ipyvega.
                        // We're not fully supporting ipyvega yet, but this ensures the scripts will not fall over and will work with minimal effort on our part.
                        const context = {
                            outputs: [{
                                metadata: ${JSON.stringify(metadata || {})}, data: {}
                            }],
                        };
                        // Required by JS code in Jupyter notebook renderers again, even scenepic (Microsoft Python widget) uses this.
                        const ele = $(document.getElementById("${element.id}"));
                        (function (element){
                            gotToUserScript = true;
                            ${script}
                        }).call(context, ele);
                    } catch (ex) {
                        console.error('VS Code Renderer failed to render output', ex);

                        if (gotToUserScript) {
                            throw ex;
                        } else {
                            // Something went wrong in our script that was generated by us.
                            ${script}
                        }
                    }
                })();`;
			},
		});
	} catch (ex) {
		throw new Error(`Failed to register JavaScript rendering hook: ${ex}`);
	}
}
