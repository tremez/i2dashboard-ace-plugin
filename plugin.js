(function () {
	var mode = 'json',
		expand = {
			width: 50,
			height: 300
		};


	function convertToAce(textarea) {
		var controls = $(textarea).parent().parent().find(".i2-table-row-controls");
		var fscontrol = $('<a><i class="i2-fseditor-button i2-icon icon-edit"></i></a>')
		controls.append(fscontrol);
		fscontrol.on('click', function () {


			var textareaStyle = window.getComputedStyle(textarea),
				holder = document.createElement('div'),
				editor, session;

			$(holder).dialog({
				title: $('#model\\.name').val()+ ' - JSON Editor',
				width: $(window).width()-50,
				height: $(window).height()-50,
				modal: true,

			});


			//textarea.style.visibility = 'hidden';
			//textarea.parentNode.insertBefore(holder, textarea);

			ace.config.setModuleUrl('ace/mode/json_worker', chrome.runtime.getURL("ace/worker-json.js"));
			editor = ace.edit(holder);
			editor.commands.removeCommand('find');
			editor.renderer.setShowGutter(true);
			//editor.setTheme("ace/theme/github");

			session = editor.getSession();
			session.setMode("ace/mode/" + mode);
			session.setValue(textarea.value);
			//session.setUseWorker(false);


			session.on('change', function () {
				textarea.value = session.getValue();
			});
		})


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
