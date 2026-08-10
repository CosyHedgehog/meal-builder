/**
 * App entry point: kicks off auth and wires up the resize handler.
 */

/* ===================== Init ===================== */
initAuth();
window.addEventListener('resize', () => {
  if(document.getElementById('app') && document.getElementById('app').innerHTML) {
    renderApp();
  }
});
