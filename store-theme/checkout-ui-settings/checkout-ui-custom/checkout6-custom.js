// WARNING: THE USAGE OF CUSTOM SCRIPTS IS NOT SUPPORTED. VTEX IS NOT LIABLE FOR ANY DAMAGES THIS MAY CAUSE. THIS MAY BREAK YOUR STORE AND STOP SALES. IN CASE OF ERRORS, PLEASE DELETE THE CONTENT OF THIS SCRIPT.

/* ==========================================================================
   Rodape do checkout - acordeao dos menus no mobile
   Markup: footer.html | Estilos: checkout6-custom.css

   O estado do acordeao vive no aria-expanded do proprio <button>, e o CSS
   reage a ele (`[aria-expanded="true"] + .dsp-footer__links`). Por isso este
   script so alterna o atributo: nada de classe de estado paralela.

   Como o gatilho e um <button> de verdade, foco e teclado (Enter/Espaco)
   funcionam nativamente - nao ha handler de teclado aqui.
   ========================================================================== */

(function () {
    'use strict';

    var TOGGLE = '.dsp-footer__col-toggle';
    var DESKTOP_MIN_WIDTH = 980; // mesmo breakpoint do CSS

    // O checkout pode rodar em navegador sem Element.closest
    function closest(el, selector) {
        if (!el || el.nodeType !== 1) return null;
        if (el.closest) return el.closest(selector);
        var node = el;
        while (node && node.nodeType === 1) {
            if (node.matches && node.matches(selector)) return node;
            node = node.parentElement;
        }
        return null;
    }

    // Delegado no document: funciona mesmo que o rodape entre no DOM depois
    // e sobrevive a re-render do checkout sem reanexar handler.
    document.addEventListener('click', function (e) {
        var btn = closest(e.target, TOGGLE);
        if (!btn) return;

        // no desktop o botao e apenas o titulo da coluna
        if (window.innerWidth >= DESKTOP_MIN_WIDTH) return;

        btn.setAttribute(
            'aria-expanded',
            btn.getAttribute('aria-expanded') === 'true' ? 'false' : 'true'
        );
    });
})();
