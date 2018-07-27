(function () {
    String.prototype.replaceAll = function (search, replacement) {
        let target = this;
        return target.replace(new RegExp(search, 'g'), replacement);
    };

    Array.prototype.getUnique = function () {
        let o = {}, a = [], i, e;
        for (i = 0; e = this[i]; i++) {
            o[e] = 1
        }

        for (e in o) {
            a.push(e)
        }

        return a;
    };

    let prodI2 = 'http://i2.portal.revjet.com';
    let apiPrefix = '/i2/api/v1/';
    let defaultEntityFieldsQuery = 'fields=id,name,tag,properties,dictionaryProperty,relations[*(id,name,tag)]'
    /*
     /classes/ad_group3 - class structure
     /classes/ad_group3/entities/1152793 - actual entity
     /classes/ad_group3/entities?query=tag:ag122 - SEARCH BY TAG
     */
    let patchLimit = 20;
    let multiChangeSetHeader = '<databaseChangeLog xmlns="http://www.liquibase.org/xml/ns/dbchangelog" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog 	http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-2.0.xsd"	logicalFilePath="CSP-17464-generic-task-type">';
    let multiChangeSetFooter = '</databaseChangeLog>';
    let postTemplate = `

	    <changeSet id="{{classname}}-{{entityId}}" author="autogenerated@tort" dbms="i2">
        <sql stripComments="true">
            <![CDATA[
                POST v1/classes/{{classname}}/entities?secured=false {{payload}}
      ]]>
        </sql>
    </changeSet>

	`;

    let postTemplateDictionary = `

	    <changeSet id="dictionary-{{dictionaryName}}-definition" author="autogenerated@tort" dbms="i2">
        <sql stripComments="true">
            <![CDATA[
                POST v1/dictionaries {{payload}}
      ]]>
        </sql>
    </changeSet>

	`;

    let putTemplateClass = `

	    <changeSet id="{{classname}}-{{entityId}}" author="autogenerated@tort" dbms="i2">
        <sql stripComments="true">
            <![CDATA[
                PUT v1/classes/{{classname}} {{payload}}
      ]]>
        </sql>
    </changeSet>

	`;


    let patchTemplate = `

	    <changeSet id="{{classname}}-{{entityId}}-{{revision}}" author="autogenerated@tort" dbms="i2">
        <sql stripComments="true">
            <![CDATA[
            	PATCH v1/classes/{{classname}}/entities?query=tag:{{entitytag}}&limit=1 {{payload}}

      ]]>
        </sql>
    </changeSet>

	`;

    let patchTemplateDictionary = `

	    <changeSet id="{{dictionaryName}}-{{revision}}" author="autogenerated@tort" dbms="i2">
        <sql stripComments="true">
            <![CDATA[
            	PATCH v1/dictionaries/?query=tag:{{dictionaryName}} {{payload}}

      ]]>
        </sql>
    </changeSet>

	`;

    let patchTemplateClass = `

	    <changeSet id="{{classname}}-{{revision}}" author="autogenerated@tort" dbms="i2">
        <sql stripComments="true">
            <![CDATA[
            	PATCH v1/classes/{{classname}} {{payload}}

      ]]>
        </sql>
    </changeSet>

	`;


    function parseLocation(location) {
        let parts = location.split('#');
        let data = parts[1];
        parts = data.split('/');
        let entityTag = $('#model\\.tag').val();
        let ret = {};
        ret.type = parts[1];
        switch (ret.type) {
            case 'dictionaries':
                ret.dictionaryId = parts[2];
                ret.dictionaryName = entityTag;
                break;
            default:
                ret.class = parts[2];
                ret.className = entityTag;
                break;

        }
        if (parts.length == 5) {
            ret.entityId = parts[4]
        }
        return ret;


    }

    function isObject(obj) {
        return Object.prototype.toString.call(obj) === '[object Object]';
    }

    function convertToAce(textarea, mode) {
        let controls = $(textarea).parent().parent().find('.i2-table-row-controls');
        let fscontrol = $('<a><i class="i2-fseditor-button i2-icon icon-edit"></i></a>');

        mode = mode || 'json';
        controls.append(fscontrol);

        fscontrol.on('click', function () {
            let textareaStyle = window.getComputedStyle(textarea),
                holder = document.createElement('div'),
                editor, session;

            $(holder).dialog({
                title: $('#model\\.name').val() + ' - ' + mode.toUpperCase() + ' Editor',
                width: $(window).width() - 50,
                height: $(window).height() - 50,
                modal: true,
                create: function (event, ui) {
                    $("body").css({overflow: 'hidden'})
                },
                beforeClose: function (event, ui) {
                    $("body").css({overflow: 'inherit'})
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
            let value = textarea.value
            if (mode === 'json') {
                try {
                    let o = JSON.parse(value);
                    value = JSON.stringify(o, null, 4);
                } catch (e) {

                }
            }
            session.setValue(value);


            session.on('change', function () {
                textarea.value = session.getValue();
            });
        })


    }

    function showVisualDiff(left, right, isClass) {
        let instance = jsondiffpatch.create({
            objectHash: function (obj, index) {
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
        //console.log('T1');
        let delta = instance.diff(left, right);
        //let html=jsondiffpatch.html.diffToHtml(localVersion[0], remoteVersion[0], delta)
        //console.log('T2');

        let html = $(jsondiffpatch.formatters.html.format(delta, left));
        //jsondiffpatch.formatters.html.hideUnchanged();
        //console.log('T3');

        let location = parseLocation(document.location.href);
        let title = location.class;
        if (!isClass) {
            title += ' : ' + $('#model\\.name').val();
        }
        //console.log('T4');

        title += ' Visual Diff (PROD -> LOCAL)';

        if (!html.length) {
            html = $('<div>NO CHANGES</div>');
        }

        $(html).dialog({
            title: title,
            width: $(window).width() - 50,
            height: $(window).height() - 50,
            modal: true,
            create: function (event, ui) {
                $("body").css({overflow: 'hidden'})
            },
            beforeClose: function (event, ui) {
                $("body").css({overflow: 'inherit'})
            }
        });
        //console.log('T6');

    };

    function compareWithProd(e) {
        e.preventDefault();
        let tag = $('#model\\.tag').val();
        let host = document.location.protocol + '//' + document.location.host;
        //if(document.location.port){
        //	host+=':'+document.location.port;
        //}

        let location = parseLocation(document.location.href);

        let query = '/classes/' + location.class;
        if (location.entityId) {
            query += '/entities?query=tag:' + tag + '&' + defaultEntityFieldsQuery;
        }


        let apiUrl = host + apiPrefix + query;
        let prodUrl = prodI2 + apiPrefix + query;
        let d1 = $.get(apiUrl);
        let d2 = $.get(prodUrl);

        $.when(d1, d2).done(function (localVersion, remoteVersion) {
            let left = remoteVersion[0];
            let right = localVersion[0];
            if (location.entityId) {
                left = left['records'][0];
                right = right['records'][0];

            }
            showVisualDiff(left, right);
        });

    }


    function compareClassDefinitionWithProd(e) {
        e.preventDefault();
        let host = document.location.protocol + '//' + document.location.host;
        // host already includes port !!!
        // if (document.location.port) {
        // 	host += ':' + document.location.port;
        // }

        let location = parseLocation(document.location.href);

        let query = '/classes/' + location.class;
        let apiUrl = host + apiPrefix + query;
        let prodUrl = prodI2 + apiPrefix + query;
        console.log(apiUrl, prodUrl);

        let d1 = $.get(apiUrl);
        let d2 = $.get(prodUrl);

        console.log(apiUrl, prodUrl);

        $.when(d1, d2).done(function (localVersion, remoteVersion) {

            console.log('1111');

            let left = remoteVersion[0];
            let right = localVersion[0];
            console.log('1111', left, right);

            showVisualDiff(left, right, true);
        });

    }

    function prepareEntity(obj) {


        let toRemoveProperties = ['id', 'legacyId', 'revision', 'creationDate', 'createdBy', 'modificationDate', 'lastModifiedBy', 'dictionaryId'];
        toRemoveProperties.forEach(function (val, index) {
            delete obj[val];
        });
        let keys = Object.keys(obj);
        keys.forEach(function (key) {

            if (Array.isArray(obj[key])) {
                obj[key].forEach(function (val) {
                    if (isObject(val)) {
                        val = prepareEntity(val);
                    }
                })
            }
            ;


            if (isObject(obj[key])) {
                obj[key] = prepareEntity(obj[key]);
            }

        });
        return obj;


    }

    function jsonRepresentationClassOrDictionary(e) {
        e.preventDefault();
        let host = document.location.protocol + '//' + document.location.host;
        // if(document.location.port){
        // 	host+=':'+document.location.port;
        // }
        let location = parseLocation(document.location.href);
        //http://i2master1-1.sgb71.mycmdb.net:8180/i2/api/v1/classes/bpm_timer_schedule?fields=*,derivedProperties
        let apiUrl;
        if (location.class) {
            apiUrl = host + '/i2/api/v1/classes/' + location.class + '?fields=*,derivedProperties';
        }
        if (location.dictionaryId) {
            apiUrl = host + '/i2/api/v1/dictionaries/' + location.dictionaryId;
        }



        let d1 = $.get(apiUrl);
        $.when(d1).done(function (localVersion) {
            localVersion = prepareEntity(localVersion);
            let payload = JSON.stringify(localVersion, null, 4);

            let postTemplate1;
            if (location.class) {
                postTemplate1 = putTemplateClass.replace('{{payload}}', payload);

            }
            if (location.dictionaryId) {
                postTemplate1 = postTemplateDictionary.replace('{{payload}}', payload);

            }

            postTemplate1 = postTemplate1.replace('{{classname}}', location.class);
            postTemplate1 = postTemplate1.replace('{{classname}}', location.class);
            postTemplate1 = postTemplate1.replace('{{dictionaryName}}', location.dictionaryName);
            postTemplate1 = postTemplate1.replace('{{dictionaryName}}', location.dictionaryName);

            postTemplate1 = postTemplate1.replace('{{entityId}}', 'classdef');

            // console.log(postTemplate1);
            // window.open('data:text/xml,' + encodeURIComponent(postTemplate1), location.class + '-' + location.entityId, "width=300,height=300,scrollbars=1,resizable=1");

            postTemplate1 = vkbeautify.xml(postTemplate1, 4);
            let bigChangesetOut = '<textarea cols="100" style="border:1px solid red">' + postTemplate1 + '</textarea>';
            //console.log(bigChangesetOut);

            $(bigChangesetOut).dialog({
                width: 800,
                height: 800,
                title: 'Definition ChangeSet'
            });


        });

    }

    function jsonRepresentationChangeset(e) {
        e.preventDefault();
        let host = document.location.protocol + '//' + document.location.host;
        // if(document.location.port){
        // 	host+=':'+document.location.port;
        // }
        let location = parseLocation(document.location.href);
        if (!location.entityId) {
            return jsonRepresentationClassOrDictionary(e);
        }

        let apiUrl = host + '/i2/api/v1/classes/' + location.class + '/entities/' + location.entityId + '?fields=*,dictionaryProperty,relations%5B*(tag)%5D';
        let d1 = $.get(apiUrl);
        $.when(d1).done(function (localVersion) {
            localVersion = prepareEntity(localVersion);
            let payload = JSON.stringify(localVersion, null, 4);
            let postTemplate1 = postTemplate.replace('{{payload}}', payload);
            postTemplate1 = postTemplate1.replace('{{classname}}', location.class);
            postTemplate1 = postTemplate1.replace('{{classname}}', location.class);
            postTemplate1 = postTemplate1.replace('{{entityId}}', location.entityId);

            // console.log(postTemplate1);
            // window.open('data:text/xml,' + encodeURIComponent(postTemplate1), location.class + '-' + location.entityId, "width=300,height=300,scrollbars=1,resizable=1");
            postTemplate1 = vkbeautify.xml(postTemplate1, 4);
            let bigChangesetOut = '<textarea cols="100" style="border:1px solid red">' + postTemplate1 + '</textarea>';
            //console.log(bigChangesetOut);

            $(bigChangesetOut).dialog({
                width: 800,
                height: 800,
                title: 'Entity CS' + location.class + '-' + location.entityId
            });


        });

    }


    function patchHeaderChangeset(e) {
        e.preventDefault();
        let host = document.location.protocol + '//' + document.location.host;
        // if(document.location.port){
        // 	host+=':'+document.location.port;
        // }
        let location = parseLocation(document.location.href);
        let entityTag = $('#model\\.tag').val();
        //http://i2balancer1-1.sla438.mycmdb.net:8181/i2/api/v1/classes/notification_rules_template/entities/3523829/changesets
        let apiUrl;
        if (location.class) {
            if (location.entityId) {
                apiUrl = host + '/i2/api/v1/classes/' + location.class + '/entities/' + location.entityId + '/changesets?limit=' + patchLimit;

            } else {
                apiUrl = host + '/i2/api/v1/classes/' + location.class + '/changesets?limit=' + patchLimit;

            }

        }
        if (location.dictionaryId) {
            apiUrl = host + '/i2/api/v1/dictionaries/' + location.dictionaryId + '/changesets?limit=' + patchLimit;
        }

        //let apiUrl = host + '/i2/api/v1/classes/' + location.class + '/entities/' + location.entityId + '/changesets?limit=' + patchLimit;
        let d1 = $.get(apiUrl);
        $.when(d1).done(function (localVersion) {
            let ids = [];
            let idsUrl;


            let records = localVersion.records;
            records.forEach(function (record) {
                let changes = record.changes;
                if (changes) {
                    changes.forEach(function (change) {
                        if (change.targetEntityId) {
                            ids.push(change.targetEntityId)
                        }
                    })
                }

            });
            ids = ids.getUnique();
            if (ids.length) {
                idsUrl = host + '/i2/api/v1/entities?offset=0&limit=' + ids.length + '&query=id:' + JSON.stringify(ids) + '&fields=id,tag';

            }

            if (idsUrl) {
                let d2 = $.get(idsUrl);
                $.when(d2).done(function (idsData) {
                    idsData = idsData.records;
                    console.log('GOT IDS', ids.length, idsData);

                    let bigChangeset = "!!!! ONLY LAST " + patchLimit + " CHANGESETS\n";
                    records.forEach(function (record) {
                        bigChangeset += "\n--------------------" + record.timestamp + "-" + record.author + "------------------------------------------\n";
                        let changes = record.changes || [];
                        changes = changes.map(function (change) {

                            if (change.targetEntityId) {
                                let id = change.targetEntityId;
                                let tag = idsData.find(function (data) {
                                    return data.id == id;
                                })
                                if (tag) {
                                    delete change.targetEntityId;
                                    change.targetEntityTag = tag.tag;
                                }
                            }

                            if (change.name === 'tag' && change.operand === 'attribute') {
                                entityTag = change.previousValue;
                                delete change.previousValue;

                            }


                            return change;
                        })
                        let patchTemplate1;
                        if (location.class) {
                            if (location.entityId) {
                                patchTemplate1 = patchTemplate
                            } else {
                                patchTemplate1 = patchTemplateClass;
                            }
                        }
                        if (location.dictionaryId) {
                            patchTemplate1 = patchTemplateDictionary;

                        }
                        let payload = JSON.stringify(changes, null, 4);
                        patchTemplate1 = patchTemplate1.replace('{{payload}}', payload);
                        patchTemplate1 = patchTemplate1.replace('{{classname}}', location.class);
                        patchTemplate1 = patchTemplate1.replace('{{classname}}', location.class);
                        patchTemplate1 = patchTemplate1.replace('{{entityId}}', location.entityId);
                        patchTemplate1 = patchTemplate1.replace('{{revision}}', record.revision);
                        patchTemplate1 = patchTemplate1.replace('{{entitytag}}', entityTag);
                        patchTemplate1 = patchTemplate1.replace('{{dictionaryName}}', location.dictionaryName);
                        patchTemplate1 = patchTemplate1.replace('{{dictionaryName}}', location.dictionaryName);


                        bigChangeset += patchTemplate1;
                    }.bind(this));
                    //localVersion=prepareEntity(localVersion);
                    //let payload=JSON.stringify(localVersion,null,4);

                    //let bigChangesetOut = '<pre>' + bigChangeset.replaceAll('<', '&lt;').replace('>', '&gt;') + '</pre>';
                    //console.log(bigChangeset);
                    //window.open(location.class + '-' + location.entityId, location.class + '-' + location.entityId, "width=300,height=300,scrollbars=1,resizable=1").document.write(bigChangesetOut);

                    let bigChangesetOut = '<textarea cols="100" style="border:1px solid red">' + bigChangeset + '</textarea>';
                    //console.log(bigChangesetOut);

                    $(bigChangesetOut).dialog({
                        width: 800,
                        height: 800,
                        title: 'TOP 20 PATCH ChangeSet(s):'
                    });


                })
            } else {
                let bigChangeset = "!!!! ONLY LAST " + patchLimit + " CHANGESETS\n";
                records.forEach(function (record) {
                    bigChangeset += "\n--------------------" + record.timestamp + "-" + record.author + "------------------------------------------\n";
                    let payload = JSON.stringify(record.changes, null, 4);

                    let patchTemplate1;
                    if (location.class) {
                        if (location.entityId) {
                            patchTemplate1 = patchTemplate
                        } else {
                            patchTemplate1 = patchTemplateClass;
                        }
                    }
                    if (location.dictionaryId) {
                        patchTemplate1 = patchTemplateDictionary;

                    }
                    if (location.dictionaryId) {
                        patchTemplate1 = patchTemplateDictionary;

                    }

                    patchTemplate1 = patchTemplate1.replace('{{payload}}', payload);
                    patchTemplate1 = patchTemplate1.replace('{{classname}}', location.class);
                    patchTemplate1 = patchTemplate1.replace('{{classname}}', location.class);
                    patchTemplate1 = patchTemplate1.replace('{{entityId}}', location.entityId);
                    patchTemplate1 = patchTemplate1.replace('{{revision}}', record.revision);
                    patchTemplate1 = patchTemplate1.replace('{{entitytag}}', entityTag);
                    patchTemplate1 = patchTemplate1.replace('{{dictionaryName}}', location.dictionaryName);
                    patchTemplate1 = patchTemplate1.replace('{{dictionaryName}}', location.dictionaryName);


                    bigChangeset += patchTemplate1;
                }.bind(this));
                //localVersion=prepareEntity(localVersion);
                //let payload=JSON.stringify(localVersion,null,4);

                //let bigChangesetOut = '<pre>' + bigChangeset.replaceAll('<', '&lt;').replace('>', '&gt;') + '</pre>';
                //console.log(bigChangeset);
                //window.open(location.class + '-' + location.entityId, location.class + '-' + location.entityId, "width=300,height=300,scrollbars=1,resizable=1").document.write(bigChangesetOut);

                let bigChangesetOut = '<textarea cols="100" style="border:1px solid red">' + bigChangeset + '</textarea>';
                //console.log(bigChangesetOut);

                $(bigChangesetOut).dialog({
                    width: 800,
                    height: 800,
                    title: 'TOP 20 PATCH ChangeSet(s):'
                });

            }


        });

    }


    function jsonRepresentationChangesetAll(e) {
        e.preventDefault();
        let host = document.location.protocol + '//' + document.location.host;
        // if(document.location.port){
        // 	host+=':'+document.location.port;
        // }
        let location = parseLocation(document.location.href);

        let apiUrl = host + '/i2/api/v1/classes/' + location.class + '/entities/' + '?limit=10000&fields=*,dictionaryProperty,relations%5B*(tag)%5D';
        let d1 = $.get(apiUrl);
        $.when(d1).done(function (data) {
            let localVersion = data.records;
            localVersion = prepareEntity(localVersion);
            let payload = JSON.stringify(localVersion, null, 4);
            postTemplate1 = postTemplate.replace('{{payload}}', payload);
            postTemplate1 = postTemplate1.replace('{{classname}}', location.class);
            postTemplate1 = postTemplate1.replace('{{classname}}', location.class);
            let eid = location.entityId;
            if (Array.isArray(localVersion)) {
                eid = 'all';
            }
            postTemplate1 = postTemplate1.replace('{{entityId}}', eid);

            window.open('data:text/xml,' + encodeURIComponent(postTemplate1), location.class + '-' + location.entityId, "width=300,height=300,scrollbars=1,resizable=1");

        });
    }

    function jsonRepresentationChangesetPatchMessagesAll(e) {
        e.preventDefault();
        let host = document.location.protocol + '//' + document.location.host;
        // if(document.location.port){
        // 	host+=':'+document.location.port;
        // }
        let location = parseLocation(document.location.href);
        let bigText = [];
        let apiUrl = host + '/i2/api/v1/classes/' + location.class + '/entities/' + '?limit=10000&fields=*,dictionaryProperty,relations%5B*(tag)%5D';
        let d1 = $.get(apiUrl);
        $.when(d1).done(function (data) {
            let records = data.records;
            let milliseconds = (new Date).getTime();
            records.forEach(function (record) {
                let entitytag = record.tag;
                let patchTemplate1 = patchTemplate.replace('{{classname}}', location.class);
                patchTemplate1 = patchTemplate1.replace('{{classname}}', location.class);
                patchTemplate1 = patchTemplate1.replace('{{entitytag}}', entitytag);

                let eid = record.id + '-' + record.tag + '-' + milliseconds;
                // if(Array.isArray(localVersion)){
                // 	eid='all';
                // }
                patchTemplate1 = patchTemplate1.replace('{{entityId}}', eid);
                let payload = [];
                let properties = record.properties;
                let propKeys = Object.keys(properties);
                propKeys.forEach(function (key) {
                    if (key == 'body' || key == 'subject') {
                        let prop = properties[key];
                        let change = {
                            "operand": "property",
                            "op": "UPDATE",
                            "name": key,
                            "value": prop.values[0]
                        }
                        payload.push(change);
                    }

                });
                patchTemplate1 = patchTemplate1.replace('{{payload}}', JSON.stringify(payload, null, 4));
                //console.log(patchTemplate1);
                bigText.push(patchTemplate1);


            })
            // let localVersion=data.records;
            // localVersion=prepareEntity(localVersion);
            // let payload=JSON.stringify(localVersion,null,4);
            // let postTemplate1=postTemplate.replace('{{payload}}',payload);
            // let postTemplate1=postTemplate1.replace('{{classname}}',location.class);
            // let postTemplate1=postTemplate1.replace('{{classname}}',location.class);
            // let eid=location.entityId;
            // if(Array.isArray(localVersion)){
            // 	eid='all';
            // }
            // let postTemplate1=postTemplate1.replace('{{entityId}}',eid);
            //
            //
            console.log('------------START--');

            console.log(bigText.join('\n'));
            console.log('------------COMPLETE--');

            //window.open('data:text/xml,'+encodeURIComponent(bigText.join('\n')),location.class+'-'+location.entityId, "width=300,height=300,scrollbars=1,resizable=1");

        });
    }

    document.addEventListener('DOMNodeInserted', function (e) {
        let node = e.target, text;
        if (node.nodeType === 1 && node.type === 'textarea') {
            if (e.target.value.trim().indexOf('{') === 0) {
                convertToAce(node, 'json');
            } else if (e.target.value.trim().indexOf('<') === 0) {
                convertToAce(node, 'html');
            }
        }

        let button = $(document).has('#save-changes-button');
        if (!button.length) {
            let saveButton = $('<div class="form-actions"><button id="save-changes-button" type="submit" class="btn">Save changes</button><button id="cancel-changes-button" type="button" class="btn btn-link">Cancel</button></div>')
            saveButton.insertAfter('.message-holder');
        }

        $('#model\\.tag').attr('disabled', false);


        let breadcrumb = $('.breadcrumb');
        if (breadcrumb.length) {
            let menu = $(document).has('.tremezmenu');
            if (!menu.length) {
                let btngroup = breadcrumb.find('.pull-right');

                menu = `
                    <div class="dropdown tremezmenu btn-group">
					    <button class="btn btn-small dropdown-toggle" type="button" id="dropdownMenu1" data-toggle="dropdown" aria-expanded="true">
					        <span class="glyphicon-birthday-cake"></span>
					    </button>
					    <ul class="dropdown-menu" role="menu" aria-labelledby="dropdownMenu1" style="right:0;left:initial">
					        <li role="presentation"><a role="menuitem" tabindex="-1" class="jsonRepresentationChangeset" href="#" title="POST changeset for current shown item">POST changeset for current shown item</a></li>
					        <li role="presentation"><a role="menuitem" tabindex="-1" class="patchHeaderChangeset" href="#" title="TOP 20 PATCH for CURRENT entity/class">TOP 20 PATCH for current item</a></li>
					    </ul>
					</div>`;
                menu = $(menu);
                btngroup.prepend(menu);
                //FIX layout for standard COG - push right

                $(btngroup).find('ul').css({
                    left:'initial',
                    right:0
                });

                //$('.compareWithProd').click(compareWithProd);
                //$('.compareClassDefinitionWithProd').click(compareClassDefinitionWithProd);
                $('.jsonRepresentationChangeset').click(jsonRepresentationChangeset);
                $('.patchHeaderChangeset').click(patchHeaderChangeset);
                //$('.jsonRepresentationChangesetAll').click(jsonRepresentationChangesetAll);
                //$('.jsonRepresentationClass').click(jsonRepresentationClassOrDictionary);
                //$('.jsonRepresentationChangesetPatchMessagesAll').click(jsonRepresentationChangesetPatchMessagesAll);

                //$('.fastPost').click(jsonRepresentationChangeset);
                //$('.classFastPost').click(jsonRepresentationClassOrDictionary);


            }


        }

    }, false);


}())
