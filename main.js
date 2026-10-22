// Hero diagram: draws data moving along each edge and highlights a node's connections on hover.
(function () {
  var dag = document.querySelector('.dag');
  if (!dag) return;
  var edges = Array.prototype.slice.call(dag.querySelectorAll('.edge'));

  // One animated "flow" path on top of each edge, staggered so packets don't move in lockstep.
  edges.forEach(function (edge, i) {
    var flow = edge.cloneNode(false);
    flow.setAttribute('class', 'flow');
    flow.style.animationDelay = (-i * 0.37) + 's';
    edge.parentNode.appendChild(flow);
  });

  var paths = Array.prototype.slice.call(dag.querySelectorAll('[data-link]'));
  var nodes = Array.prototype.slice.call(dag.querySelectorAll('.n'));

  function clear() {
    dag.classList.remove('focus');
    paths.concat(nodes).forEach(function (el) { el.classList.remove('hl'); });
  }

  nodes.forEach(function (node) {
    var id = node.getAttribute('data-node');
    node.addEventListener('pointerenter', function () {
      clear();
      dag.classList.add('focus');
      node.classList.add('hl');
      paths.forEach(function (p) {
        var ends = p.getAttribute('data-link').split(' ');
        if (ends.indexOf(id) !== -1) {
          p.classList.add('hl');
          nodes.forEach(function (n) {
            if (ends.indexOf(n.getAttribute('data-node')) !== -1) n.classList.add('hl');
          });
        }
      });
    });
    node.addEventListener('pointerleave', clear);
  });
})();
