// Web Worker for Pyodide Execution
// Loads Pyodide from CDN and handles Python code execution

importScripts("https://cdn.jsdelivr.net/pyodide/v0.25.1/full/pyodide.js");

let pyodide = null;
let pyodideReadyPromise = null;

async function loadPyodideEnv() {
    if (pyodide) return pyodide;

    try {
        pyodide = await loadPyodide();
        // Load key scientific packages
        await pyodide.loadPackage(["numpy", "matplotlib", "pandas"]);

        // Initialize Setup for Plotting
        await pyodide.runPythonAsync(`
import sys
import io
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

def _get_plots_base64():
    plots = []
    # Iterate over open figures
    for i in plt.get_fignums():
        fig = plt.figure(i)
        buf = io.BytesIO()
        fig.savefig(buf, format='png', bbox_inches='tight')
        buf.seek(0)
        img_str = base64.b64encode(buf.read()).decode('utf-8')
        plots.append(img_str)
        plt.close(fig) # Close to avoid memory leaks
    return plots
        `);
        return pyodide;
    } catch (e) {
        console.error("Failed to load pyodide:", e);
        throw e;
    }
}

self.onmessage = async (event) => {
    const { id, action, code } = event.data;

    if (action === "init") {
        try {
            pyodideReadyPromise = loadPyodideEnv();
            await pyodideReadyPromise;
            self.postMessage({ id, type: "ready" });
        } catch (error) {
            self.postMessage({ id, type: "error", error: error.message });
        }
        return;
    }

    if (action === "run") {
        if (!pyodide) {
            self.postMessage({ id, type: "error", error: "Pyodide not loaded. Wait for initialization." });
            return;
        }

        try {
            // 1. Prepare Environment
            await pyodide.runPythonAsync("import sys; import io; import base64; sys.stdout = io.StringIO(); sys.stderr = io.StringIO();");

            // 2. Capture stdout callbacks
            // We use a custom print handler if needed, but here we'll pull from sys.stdout after run
            // Alternatively, setStdout works well for streaming
            pyodide.setStdout({ batched: (msg) => self.postMessage({ id, type: "stdout", text: msg }) });
            pyodide.setStderr({ batched: (msg) => self.postMessage({ id, type: "stderr", text: msg }) });

            // 3. Execute User Code
            await pyodide.runPythonAsync(code);

            // 4. Capture Plots
            // check available plots
            const plotsProxy = await pyodide.runPythonAsync("_get_plots_base64()");
            const plots = plotsProxy.toJs();
            plotsProxy.destroy();

            // 5. Done
            self.postMessage({ id, type: "done", plots });

        } catch (error) {
            self.postMessage({ id, type: "error", error: error.message });
        }
    }
};
