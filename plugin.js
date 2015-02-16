$(function () {


	function convertToAce(el){

		var textarea = el;

		var mode = 'json';

		var editDiv = $('<div>', {
			position: 'absolute',
			width: textarea.width()+100,
			height: textarea.height()+300,

		}).insertBefore(textarea);
		textarea.css('visibility', 'hidden');
		var editor = ace.edit(editDiv[0]);
		editor.renderer.setShowGutter(true);
		editor.getSession().setValue(textarea.val());
		editor.getSession().setMode("ace/mode/" + mode);
		//editor.setTheme("ace/theme/github");

		editor.getSession().on('change', function(){
			textarea.val(editor.getSession().getValue());
		});

	}


	$(document).on('DOMNodeInserted', function(e) {


		if($(e.target).is('textarea')){
			var textarea=$(e.target);
			var value=textarea.val();
			if(value.indexOf('{')!=-1){
				convertToAce(textarea);
			}

		}

	});


});