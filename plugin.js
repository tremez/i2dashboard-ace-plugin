(function () {
  var mode = 'json',
      expand = {
        width: 50,
        height: 300
      };

  function convertToAce(textarea) {
    var textareaStyle = window.getComputedStyle(textarea),
        holder = document.createElement('div'),
        editor, session;

    with(holder.style) {
      width = Math.floor(parseFloat(textareaStyle.width) * 10) / 10 + expand.width + 'px';
      height = Math.floor(parseFloat(textareaStyle.height) * 10) / 10 +  expand.height + 'px';

    }

    textarea.style.visibility = 'hidden';
    textarea.parentNode.insertBefore(holder, textarea);

    ace.config.setModuleUrl('ace/mode/json_worker', chrome.runtime.getURL("ace/worker-json.js"));
    editor = ace.edit(holder);
    
    editor.renderer.setShowGutter(true);
    //editor.setTheme("ace/theme/github");

    session = editor.getSession();
    session.setMode("ace/mode/" + mode);
    session.setValue(textarea.value);
    //session.setUseWorker(false);
    

    session.on('change', function(){
      textarea.value = session.getValue();
    });


  }

  document.addEventListener('DOMNodeInserted', function (e) {
    var node = e.target, text;
    if (node.nodeType === 1 && node.type === 'textarea') {
      if (e.target.value.trim().indexOf('{') === 0) {
        convertToAce(node);
      }
    }
  }, false);
}())
