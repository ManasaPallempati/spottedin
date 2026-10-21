// Marks every <img> with `is-loaded` once it has loaded (or failed), so motion.css can
// fade photos in over a soft placeholder instead of popping them in line by line.
// One capture-phase listener on the document covers every image the app renders,
// so no component has to opt in.
export function watchImageLoads(doc: Document = document) {
  const mark = (event: Event) => {
    const target = event.target
    if (target instanceof HTMLImageElement) target.classList.add('is-loaded')
  }
  doc.addEventListener('load', mark, true)
  doc.addEventListener('error', mark, true)
}
