(function () {
	String.prototype.replaceAll = function(search, replacement) {
		var target = this;
		return target.replace(new RegExp(search, 'g'), replacement);
	};

	Array.prototype.getUnique = function() {
		var o = {}, a = [], i, e;
		for (i = 0; e = this[i]; i++) {o[e] = 1};
		for (e in o) {a.push (e)};
		return a;
	}

	var prodI2='http://i2master1-1.sla295.mycmdb.net:8180';
	var apiPrefix='/i2/api/v1/';
	var defaultEntityFieldsQuery='fields=id,name,tag,properties,dictionaryProperty,relations[*(id,name,tag)]'
/*
 /classes/ad_group3 - class structure
 /classes/ad_group3/entities/1152793 - actual entity
 /classes/ad_group3/entities?query=tag:ag122 - SEARCH BY TAG
 */
	var patchLimit=20;
	var multiChangeSetHeader='<databaseChangeLog xmlns="http://www.liquibase.org/xml/ns/dbchangelog" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog 	http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-2.0.xsd"	logicalFilePath="CSP-17464-generic-task-type">';
	var multiChangeSetFooter='</databaseChangeLog>';
	var postTemplate=`

	    <changeSet id="{{classname}}-{{entityId}}" author="autogenerated@tort" dbms="i2">
        <sql stripComments="true">
            <![CDATA[
                POST v1/classes/{{classname}}/entities?secured=false {{payload}}
      ]]>
        </sql>
    </changeSet>

	`;

	var putTemplate=`

	    <changeSet id="{{classname}}-{{entityId}}" author="autogenerated@tort" dbms="i2">
        <sql stripComments="true">
            <![CDATA[
                PUT v1/classes/{{classname}} {{payload}}
      ]]>
        </sql>
    </changeSet>

	`;


	var patchTemplate=`

	    <changeSet id="{{classname}}-{{entityId}}-{{revision}}" author="autogenerated@tort" dbms="i2">
        <sql stripComments="true">
            <![CDATA[
            	PATCH v1/classes/{{classname}}/entities?query=tag:{{entitytag}}&limit=1 {{payload}}

      ]]>
        </sql>
    </changeSet>

	`;


	function parseLocation(location){
		var parts=location.split('#');
		var data=parts[1];
		parts=data.split('/');
		var ret={};
		ret.class=parts[2];
		if(parts.length==5){
			ret.entityId=parts[4]
		};
		return ret;


	}
	function isObject(obj){
		return Object.prototype.toString.call( obj ) === '[object Object]';
	}

	function convertToAce(textarea, mode) {
		var controls = $(textarea).parent().parent().find('.i2-table-row-controls');
		var fscontrol = $('<a><i class="i2-fseditor-button i2-icon icon-edit"></i></a>');

    mode = mode || 'json';
		controls.append(fscontrol);

		fscontrol.on('click', function () {
			var textareaStyle = window.getComputedStyle(textarea),
				holder = document.createElement('div'),
				editor, session;

			$(holder).dialog({
				title: $('#model\\.name').val() +  ' - ' + mode.toUpperCase() + ' Editor',
				width: $(window).width() - 50,
				height: $(window).height() - 50,
				modal: true,
				create: function(event, ui) {
					$("body").css({ overflow: 'hidden' })
				},
				beforeClose: function(event, ui) {
					$("body").css({ overflow: 'inherit' })
				}
			});


			//textarea.style.visibility = 'hidden';
			//textarea.parentNode.insertBefore(holder, textarea);

			ace.config.setModuleUrl('ace/mode/' + mode + '_worker',
            chrome.runtime.getURL('ace/mode/worker-' + mode + '.js'));
			editor = ace.edit(holder);
			editor.commands.removeCommand('find');
			editor.renderer.setShowGutter(true);
			//editor.setTheme("ace/theme/github");

			session = editor.getSession();
			session.setMode('ace/mode/' + mode);
			var value=textarea.value
			if(mode==='json'){
				try{
					var o = JSON.parse(value);
					value = JSON.stringify(o, null, 4);
				}catch(e){

				}
			}
			session.setValue(value);


			session.on('change', function () {
				textarea.value = session.getValue();
			});
		})


	}
	function showVisualDiff(left,right,isClass){
		var instance = jsondiffpatch.create({
			objectHash: function(obj, index) {
				if (typeof obj._id !== 'undefined') {
					return obj._id;
				}
				if (typeof obj.id !== 'undefined') {
					return obj.id;
				}
				if (typeof obj.name !== 'undefined') {
					return obj.name;
				}
				return '$$index:' + index;
			}
		});
		var delta = instance.diff(left,right );
		//var html=jsondiffpatch.html.diffToHtml(localVersion[0], remoteVersion[0], delta)
		var html=$(jsondiffpatch.formatters.html.format(delta, left));
		//jsondiffpatch.formatters.html.hideUnchanged();
		var location=parseLocation(document.location.href);
		var title=location.class;
		if(!isClass){
			title+=' : ' +$('#model\\.name').val();
		}
		title+=' Visual Diff (PROD -> LOCAL)';
		$(html).dialog({
			title: title,
			width: $(window).width() - 50,
			height: $(window).height() - 50,
			modal: true,
			create: function(event, ui) {
				$("body").css({ overflow: 'hidden' })
			},
			beforeClose: function(event, ui) {
				$("body").css({ overflow: 'inherit' })
			}
		});
	};

	function compareWithProd(e){
		e.preventDefault();
		var tag=$('#model\\.tag').val();
		var host=document.location.protocol+'//'+document.location.host;
		//if(document.location.port){
		//	host+=':'+document.location.port;
		//}

		var location=parseLocation(document.location.href);

		var query='/classes/'+location.class;
		if(location.entityId){
			query+='/entities?query=tag:'+tag+'&'+defaultEntityFieldsQuery;
		}


		var apiUrl=host+apiPrefix+query;
		var prodUrl=prodI2+apiPrefix+query;
		var d1 = $.get(apiUrl);
		var d2 = $.get(prodUrl);

		$.when( d1,d2 ).done(function ( localVersion, remoteVersion ) {
			var left=remoteVersion[0];
			var right=localVersion[0];
			if(location.entityId){
				left=left['records'][0];
				right=right['records'][0];

			}
			showVisualDiff(left,right);
		});

	}


	function compareClassDefinitionWithProd(e){
		e.preventDefault();
		var host=document.location.protocol+'//'+document.location.host;
		if(document.location.port){
			host+=':'+document.location.port;
		}

		var location=parseLocation(document.location.href);

		var query='/classes/'+location.class;
		var apiUrl=host+apiPrefix+query;
		var prodUrl=prodI2+apiPrefix+query;
		var d1 = $.get(apiUrl);
		var d2 = $.get(prodUrl);
		$.when( d1,d2 ).done(function ( localVersion, remoteVersion ) {
			var left=remoteVersion[0];
			var right=localVersion[0];
			showVisualDiff(left,right,true);
		});

	}
	function prepareEntity(obj){


		var toRemoveProperties=['id','legacyId','revision','creationDate','createdBy','modificationDate','lastModifiedBy','dictionaryId'];
		toRemoveProperties.forEach(function(val,index){
			delete obj[val];
		});
		var keys=Object.keys(obj);
		keys.forEach(function(key){

			if(Array.isArray(obj[key])){
				obj[key].forEach(function(val){
					if(isObject(val)){
						val=prepareEntity(val);
					}
				})
			};


			if(isObject(obj[key])){
				obj[key]=prepareEntity(obj[key]);
			}

		});
		return obj;


	}
	function jsonRepresentationClass(e){
		e.preventDefault();
		var host=document.location.protocol+'//'+document.location.host;
		// if(document.location.port){
		// 	host+=':'+document.location.port;
		// }
		var location=parseLocation(document.location.href);
		http://i2master1-1.sgb71.mycmdb.net:8180/i2/api/v1/classes/bpm_timer_schedule?fields=*,derivedProperties
		var apiUrl = host+'/i2/api/v1/classes/'+location.class+'?fields=*,derivedProperties';
		var d1 = $.get(apiUrl);
		$.when( d1 ).done(function ( localVersion ) {
			localVersion=prepareEntity(localVersion);
			var payload=JSON.stringify(localVersion,null,4);
			var postTemplate1=putTemplate.replace('{{payload}}',payload);
			var postTemplate1=postTemplate1.replace('{{classname}}',location.class);
			var postTemplate1=postTemplate1.replace('{{classname}}',location.class);
			var postTemplate1=postTemplate1.replace('{{entityId}}','classdef');

			console.log(postTemplate1);
			window.open('data:text/xml,'+encodeURIComponent(postTemplate1),location.class+'-'+location.entityId, "width=300,height=300,scrollbars=1,resizable=1");

		});

	}
	function jsonRepresentationChangeset(e){
		e.preventDefault();
		var host=document.location.protocol+'//'+document.location.host;
		// if(document.location.port){
		// 	host+=':'+document.location.port;
		// }
		var location=parseLocation(document.location.href);

		var apiUrl = host+'/i2/api/v1/classes/'+location.class+'/entities/'+location.entityId+'?fields=*,dictionaryProperty,relations%5B*(tag)%5D';
		var d1 = $.get(apiUrl);
		$.when( d1 ).done(function ( localVersion ) {
			localVersion=prepareEntity(localVersion);
			var payload=JSON.stringify(localVersion,null,4);
			var postTemplate1=postTemplate.replace('{{payload}}',payload);
			var postTemplate1=postTemplate1.replace('{{classname}}',location.class);
			var postTemplate1=postTemplate1.replace('{{classname}}',location.class);
			var postTemplate1=postTemplate1.replace('{{entityId}}',location.entityId);

			console.log(postTemplate1);
			window.open('data:text/xml,'+encodeURIComponent(postTemplate1),location.class+'-'+location.entityId, "width=300,height=300,scrollbars=1,resizable=1");

		});

	}


	function patchHeaderChangeset(e){
		e.preventDefault();
		var host=document.location.protocol+'//'+document.location.host;
		// if(document.location.port){
		// 	host+=':'+document.location.port;
		// }
		var location=parseLocation(document.location.href);
		var entityTag=$('#model\\.tag').val();
		//http://i2balancer1-1.sla438.mycmdb.net:8181/i2/api/v1/classes/notification_rules_template/entities/3523829/changesets
		var apiUrl = host+'/i2/api/v1/classes/'+location.class+'/entities/'+location.entityId+'/changesets?limit='+patchLimit;
		var d1 = $.get(apiUrl);
		$.when( d1 ).done(function ( localVersion ) {
			var ids=[];
			var idsUrl;


			var records=localVersion.records;
			records.forEach(function(record){
				var changes=record.changes;
				if(changes){
					changes.forEach(function(change){
						if(change.targetEntityId){
							ids.push(change.targetEntityId)
						}
					})
				}

			});
			ids=ids.getUnique();
			if(ids.length){
				idsUrl=host+'/i2/api/v1/entities?offset=0&limit='+ids.length+'&query=id:'+JSON.stringify(ids)+'&fields=id,tag';

			}

			if(idsUrl){
				var d2=$.get(idsUrl);
				$.when(d2).done(function(idsData){
					idsData=idsData.records;
					console.log('GOT IDS',ids.length,idsData);

					var bigChangeset="!!!! ONLY LAST "+patchLimit+" CHANGESETS\n";
					records.forEach(function(record){
						bigChangeset+="\n--------------------"+record.timestamp+"-"+record.author+"------------------------------------------\n";
						var changes=record.changes||[];
						changes=changes.map(function(change){
							if(change.targetEntityId){
								var id=change.targetEntityId;
								var tag=idsData.find(function(data){
									return data.id==id;
								})
								if(tag){
									delete change.targetEntityId;
									change.targetEntityTag=tag.tag;
								}
							}
							return change;
						})
						var payload=JSON.stringify(changes,null,4);
						var patchTemplate1=patchTemplate.replace('{{payload}}',payload);
						var patchTemplate1=patchTemplate1.replace('{{classname}}',location.class);
						var patchTemplate1=patchTemplate1.replace('{{classname}}',location.class);
						var patchTemplate1=patchTemplate1.replace('{{entityId}}',location.entityId);
						var patchTemplate1=patchTemplate1.replace('{{revision}}',record.revision);
						var patchTemplate1=patchTemplate1.replace('{{entitytag}}',entityTag);
						bigChangeset+=patchTemplate1;
					}.bind(this));
					//localVersion=prepareEntity(localVersion);
					//var payload=JSON.stringify(localVersion,null,4);

					var bigChangesetOut='<pre>'+bigChangeset.replaceAll('<','&lt;').replace('>','&gt;')+'</pre>';
					console.log(bigChangeset);
					window.open(location.class+'-'+location.entityId,location.class+'-'+location.entityId, "width=300,height=300,scrollbars=1,resizable=1").document.write(bigChangesetOut);



				})
			}else{
				var bigChangeset="!!!! ONLY LAST "+patchLimit+" CHANGESETS\n";
				records.forEach(function(record){
					bigChangeset+="\n--------------------"+record.timestamp+"-"+record.author+"------------------------------------------\n";
					var payload=JSON.stringify(record.changes,null,4);
					var patchTemplate1=patchTemplate.replace('{{payload}}',payload);
					var patchTemplate1=patchTemplate1.replace('{{classname}}',location.class);
					var patchTemplate1=patchTemplate1.replace('{{classname}}',location.class);
					var patchTemplate1=patchTemplate1.replace('{{entityId}}',location.entityId);
					var patchTemplate1=patchTemplate1.replace('{{revision}}',record.revision);
					var patchTemplate1=patchTemplate1.replace('{{entitytag}}',entityTag);
					bigChangeset+=patchTemplate1;
				}.bind(this));
				//localVersion=prepareEntity(localVersion);
				//var payload=JSON.stringify(localVersion,null,4);

				var bigChangesetOut='<pre>'+bigChangeset.replaceAll('<','&lt;').replace('>','&gt;')+'</pre>';
				console.log(bigChangeset);
				window.open(location.class+'-'+location.entityId,location.class+'-'+location.entityId, "width=300,height=300,scrollbars=1,resizable=1").document.write(bigChangesetOut);
			}





		});

	}


	function jsonRepresentationChangesetAll(e){
		e.preventDefault();
		var host=document.location.protocol+'//'+document.location.host;
		// if(document.location.port){
		// 	host+=':'+document.location.port;
		// }
		var location=parseLocation(document.location.href);

		var apiUrl = host+'/i2/api/v1/classes/'+location.class+'/entities/'+'?limit=10000&fields=*,dictionaryProperty,relations%5B*(tag)%5D';
		var d1 = $.get(apiUrl);
		$.when( d1 ).done(function ( data ) {
			console.log(data);
			var localVersion=data.records;
			localVersion=prepareEntity(localVersion);
			var payload=JSON.stringify(localVersion,null,4);
			var postTemplate1=postTemplate.replace('{{payload}}',payload);
			var postTemplate1=postTemplate1.replace('{{classname}}',location.class);
			var postTemplate1=postTemplate1.replace('{{classname}}',location.class);
			var eid=location.entityId;
			if(Array.isArray(localVersion)){
				eid='all';
			}
			var postTemplate1=postTemplate1.replace('{{entityId}}',eid);

			console.log(postTemplate1);
			window.open('data:text/xml,'+encodeURIComponent(postTemplate1),location.class+'-'+location.entityId, "width=300,height=300,scrollbars=1,resizable=1");

		});
	}
	function jsonRepresentationChangesetPatchMessagesAll(e){
		e.preventDefault();
		var host=document.location.protocol+'//'+document.location.host;
		// if(document.location.port){
		// 	host+=':'+document.location.port;
		// }
		var location=parseLocation(document.location.href);
		var bigText=[];
		var apiUrl = host+'/i2/api/v1/classes/'+location.class+'/entities/'+'?limit=10000&fields=*,dictionaryProperty,relations%5B*(tag)%5D';
		var d1 = $.get(apiUrl);
		$.when( d1 ).done(function ( data ) {
			var records=data.records;
			var milliseconds = (new Date).getTime();
			records.forEach(function(record){
				var entitytag=record.tag;
				var patchTemplate1=patchTemplate.replace('{{classname}}',location.class);
				var patchTemplate1=patchTemplate1.replace('{{classname}}',location.class);
				var patchTemplate1=patchTemplate1.replace('{{entitytag}}',entitytag);

				var eid=record.id+'-'+record.tag + '-'  + milliseconds;
				// if(Array.isArray(localVersion)){
				// 	eid='all';
				// }
				var patchTemplate1=patchTemplate1.replace('{{entityId}}',eid);
				var payload=[];
				var properties=record.properties;
				var propKeys=Object.keys(properties);
				propKeys.forEach(function(key){
					if(key=='body'||key=='subject'){
						var prop=properties[key];
						var change={
							"operand": "property",
							"op": "UPDATE",
							"name": key,
							"value": prop.values[0]
						}
						payload.push(change);
					}

				});
				var patchTemplate1=patchTemplate1.replace('{{payload}}',JSON.stringify(payload,null,4));
				//console.log(patchTemplate1);
				bigText.push(patchTemplate1);




			})
			// var localVersion=data.records;
			// localVersion=prepareEntity(localVersion);
			// var payload=JSON.stringify(localVersion,null,4);
			// var postTemplate1=postTemplate.replace('{{payload}}',payload);
			// var postTemplate1=postTemplate1.replace('{{classname}}',location.class);
			// var postTemplate1=postTemplate1.replace('{{classname}}',location.class);
			// var eid=location.entityId;
			// if(Array.isArray(localVersion)){
			// 	eid='all';
			// }
			// var postTemplate1=postTemplate1.replace('{{entityId}}',eid);
			//
			//
			console.log('------------START--');

			console.log(bigText.join('\n'));
			console.log('------------COMPLETE--');

			//window.open('data:text/xml,'+encodeURIComponent(bigText.join('\n')),location.class+'-'+location.entityId, "width=300,height=300,scrollbars=1,resizable=1");

		});
	}

	document.addEventListener('DOMNodeInserted', function (e) {
		var node = e.target, text;
		if (node.nodeType === 1 && node.type === 'textarea') {
			if (e.target.value.trim().indexOf('{') === 0) {
				convertToAce(node, 'json');
      } else if (e.target.value.trim().indexOf('<') === 0) {
        convertToAce(node, 'html');
      }
		}

		var button=$(document).has('#save-changes-button');
		if(!button.length){
			var saveButton=$('<div class="form-actions"><button id="save-changes-button" type="submit" class="btn">Save changes</button><button id="cancel-changes-button" type="button" class="btn btn-link">Cancel</button></div>')
			saveButton.insertAfter('.message-holder');
		}

		$('#model\\.tag').attr('disabled',false);


		var breadcrumb=$('.breadcrumb');
		if(breadcrumb.length){
			var menu=$(document).has('.tremezmenu');
			if(!menu.length){
				var btngroup=breadcrumb.find('.pull-right');
				menu='<div class="dropdown tremezmenu btn-group">' +
					'<button class="btn btn-small dropdown-toggle" type="button" id="dropdownMenu1" data-toggle="dropdown" aria-expanded="true">' +
					'<span class="glyphicon-birthday-cake"></span></button>' +
					'<ul class="dropdown-menu" role="menu" aria-labelledby="dropdownMenu1">' +
					'<li role="presentation"><a role="menuitem" tabindex="-1" class="compareWithProd" href="#">Compare with Prod version</a></li>' +
					'<li role="presentation"><a role="menuitem" tabindex="-1" class="compareClassDefinitionWithProd" href="#">Compare Class Def with Prod</a></li>' +
					'<li role="presentation"><a role="menuitem" tabindex="-1" class="jsonRepresentationClass" href="#">Changeset for Class Definition</a></li>' +
					'<li role="presentation"><a role="menuitem" tabindex="-1" class="jsonRepresentationChangeset" href="#" title="CREATE Changeset for CURRENT entity">CREATE Changeset for CURRENT entity</a></li>' +
					'<li role="presentation"><a role="menuitem" tabindex="-1" class="patchHeaderChangeset" href="#" title="Lates PATCHes for CURRENT entity">Lates PATCHes for CURRENT entity</a></li>' +
					'<li role="presentation"><a role="menuitem" tabindex="-1" class="jsonRepresentationChangesetAll" href="#">Changeset for ALL entities</a></li>' +
					'<li role="presentation"><a role="menuitem" tabindex="-1" class="jsonRepresentationChangesetPatchMessagesAll" href="#">Changeset for ALL MESSAGE entities PATCH</a></li>' +

					'</ul>' +
					'</div>';
				menu=$(menu);
				btngroup.prepend(menu);
				$('.compareWithProd').click(compareWithProd);
				$('.compareClassDefinitionWithProd').click(compareClassDefinitionWithProd);
				$('.jsonRepresentationChangeset').click(jsonRepresentationChangeset);
				$('.patchHeaderChangeset').click(patchHeaderChangeset);
				$('.jsonRepresentationChangesetAll').click(jsonRepresentationChangesetAll);
				$('.jsonRepresentationClass').click(jsonRepresentationClass);
				$('.jsonRepresentationChangesetPatchMessagesAll').click(jsonRepresentationChangesetPatchMessagesAll);



			}


		}

	}, false);




}())
