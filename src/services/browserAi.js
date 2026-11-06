let engine, worker, loadedModel;
export async function loadBrowserAi(model, onProgress) {
  if (!navigator.gpu) throw new Error('Este navegador não oferece WebGPU. Use um navegador com WebGPU ativado ou escolha Ollama local.');
  if (engine && loadedModel === model) return engine;
  releaseBrowserAi();
  const { CreateWebWorkerMLCEngine } = await import('@mlc-ai/web-llm');
  worker = new Worker(new URL('../workers/studyAi.worker.js', import.meta.url), { type: 'module' });
  try {
    engine = await CreateWebWorkerMLCEngine(worker, model, { initProgressCallback: onProgress }, { context_window_size: 4096 });
    loadedModel = model;
    return engine;
  } catch (error) { releaseBrowserAi(); throw error; }
}
export function interruptBrowserAi() { engine?.interruptGenerate(); }
export function releaseBrowserAi() { worker?.terminate(); worker = null; engine = null; loadedModel = ''; }
