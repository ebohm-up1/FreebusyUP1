define('form', ['jquery','moment', 'autocompleteUser', 'nouislider', 'slider'], function($, moment) {

moment.locale("fr");

const divpersonselect = "#divpersonselect";
const idperson_ul = "#person_ul";

const titrecreneauSelector = "#titrecreneau input[name='titrecreneau']";
const summarycreneauSelector = "#summarycreneau textarea[name='summarycreneau']";
const lieucreneauSelector = "#lieucreneau input[name='lieucreneau']";
const zoomButtonSelector = "#zoom button[name='zoom']";

var jsSessionZoomInfos = typeof(jsSessionZoomInfos) == 'undefined' ? null : jsSessionZoomInfos;
var jsSessionInviteInfos = typeof(jsSessionInviteInfos) == 'undefined' ? null : jsSessionInviteInfos;

var listDisplayname = new Map();

let newParticipant=false;
let start=null;
let end=null;

let lieuCreneauElem=null;
let colLieu=null;
let zoomElem=null;

$(function() {
    $("input#person").autocompleteUserAndGroup(
        urlwsgroupUsersAndGroups, {
        select: wsCallbackUid,
        wantedAttr: "uid",
        wsParams: {
            CAS: 1,
            filter_category: "groups",
            filter_group_cn: "collab.*|employees.*",
            filter_eduPersonAffiliation: "teacher|researcher|staff|emeritus"
        }
    });

    lieuCreneauElem = $("#lieucreneau").clone(true).detach();
    colLieu = $("#colLieu").clone(true).detach();
    zoomElem = $("#zoom").clone(true).detach();

    require(['bootstrap!tooltip'], function($) {
        $('[data-toggle="tooltip"]').tooltip({ 'html': true });
    });

    require(['bootstrap!modal'], function($) {
        $('[data-toggle="tooltip"]').modal({'show': false });
    });

    $("#form").on("submit", onSubmit);
    $("#reponse li a").on("click", onTimeClick);
    $(zoomButtonSelector).on("click", zoomClick);
    $('#creneauMailInput').on('shown.bs.modal', bsModalShowZoom.bsModalShow);
    $('#creneauMailInput').on('hidden.bs.modal', bsModalShowZoom.bsModalHide);

    setOptionsUid(jsuids);

    $('#duree option[value='+ jsduree +']').prop('selected', true);
});

function errorShow(toShow) {
    if (toShow === true) {
        if ($(divpersonselect).is(":hidden")) {
            $(divpersonselect).show();
        }
        $(".alertrequire").show();
    }
    if (toShow === false) {
        $(".alertrequire").hide();
    }
}

function getCurrentOptions() {
    let getVals = new Map();

    $(idperson_ul + " li input[name='listuids[]']").each(function (idx, option) {
        getVals.set(idx, [option.value,true]);
    });

    return getVals;
}

function testOptions(vals) {
    if (vals.size < 2) {
        return false;
    }

    let panticipantsChecked = $(idperson_ul + " li input:checked[name='listUidsOptionnels[]']");

    if ((vals.size - panticipantsChecked.length) < 2) {
        return false;
    }

    return true;
}

function afficherPermutterHide(testFormInput) {
    if (testFormInput == false) {
        errorShow(true);
    } else {
        errorShow(false);
    }
}

function setOptionsUid(jsuids) {
    for (let uid of jsuids) {
        $.ajax({
            url: urlwsgroupUserInfos,
            jsonp: "callback",
            data: { token: uid, CAS: true, maxRows: 1, attrs: "uid,displayName,mail" },
            dataType: 'jsonp',
            success: function (response) {
                if (typeof response[0].mail != "undefined") {
                    addOptionUid(response[0].uid, response[0].displayName, response[0].mail);
                }
            }
        });
    }
}

function addOptionWithUid(uid, displayName, mail) {
    listDisplayname.set(uid, {displayName: displayName, mail: mail});

    if ($(divpersonselect).is(":hidden"))
        $(divpersonselect).show();

    let newLi = $('<li>').attr('class', 'row align-items-center');

    newLi.append($('<input>').attr('type', 'text').attr('name', 'listuids[]').attr('multiple', true).attr('checked', true).val(uid).css('display', 'none'));

    newLi.append('<img class="col-2 rounded-circle" alt="' + uid + '" src="' + urlwsphoto + '?uid='+ uid + '" />');

    newLi.append($('<label>').attr('class', 'col-3 px-0').text(displayName));

    let button = $('<button>').text('supprimer').attr('class', 'col-2 px-0');
    newLi.append(button);

    let optionnel = $('<input>');
    optionnel.attr('name', 'listUidsOptionnels[]').attr('type', 'checkbox').attr('class', 'col-1 checkbox-inline').val(uid);

    if (typeof jsListUidsOptionnels != 'undefined') {
        for (let uidBlock of jsListUidsOptionnels) {
            if (uidBlock == uid) {
                optionnel.attr('checked', true);
            }
        }
    }


    newLi.append(optionnel);

    newLi.append('<label id="participant" class="col-4 px-0 text-left form-check-label" for="form-participant-optionnel">Participant optionnel</label>');

    $(idperson_ul).append(newLi);

    optionnel.on("click", function(event) {
        afficherPermutterHide(testOptions(getCurrentOptions()));

        if (event.target.checked) {
            event.target.nextElementSibling.textContent = 'Participant optionnel *';
            $('#participantExplicatif').removeClass('d-none');
            $('#participantExplicatif').addClass('d-flex');
        } else {
            event.target.nextElementSibling.textContent = 'Participant optionnel';

            let panticipantsChecked = $(idperson_ul + " li input:checked[name='listUidsOptionnels[]']");
            if (panticipantsChecked.length == 0) {
                $('#participantExplicatif').removeClass('d-flex');
            }
        }
    });

    button.on("click", function() {
        $(this).parent().remove();
        let opts = getCurrentOptions();
        let testFormInput = testOptions(opts);
        afficherPermutterHide(testFormInput);

        if (testFormInput == false && opts.size == 0) {
            $(divpersonselect).hide();
        }
    });
}

function formInvitationCheck(type="Invitation") {
    let titreSel = $("input[name='titrecreneau']");
    if (titreSel.val().length == 0) {
        $("input[name='titrecreneau']").get(0).setCustomValidity(true);
        $("input[name='titrecreneau']").get(0).reportValidity();
        $("input[name='titrecreneau']").trigger('focus');
        return false;
    } else {
        $("input[name='titrecreneau']").get(0).setCustomValidity('');
    }

    let descSel = $("textarea[name='summarycreneau']");
    if (descSel.val().length == 0) {
        $("textarea[name='summarycreneau']").get(0).setCustomValidity(true);
        $("textarea[name='summarycreneau']").get(0).reportValidity();
        $("textarea[name='summarycreneau']").trigger('focus');
        return false;
    } else {
       $("textarea[name='summarycreneau']").get(0).setCustomValidity('');
    }

    // on ne valide pas le lieu lorsqu'on crée un zoom
    if (type == "Zoom") {
        return true;
    }

    let lieuSel = $("input[name='lieucreneau']");
    if (lieuSel.val().length == 0) {
        $("input[name='lieucreneau']").get(0).setCustomValidity(true);
        $("input[name='lieucreneau']").get(0).reportValidity();
        $("input[name='lieucreneau']").trigger('focus');
        return false;
    } else {
        $("input[name='lieucreneau']").get(0).setCustomValidity('');
    }

    return true;
}

function addOptionUid(uid, displayName, mail) {
    //let uid=this.value;
    let vals = getCurrentOptions();

    let testUidVals = false;
    for (const [key, value] of vals) {
        if (value.at() == uid) {
            testUidVals = true;
        }
    }

    if (testUidVals === false) {
        addOptionWithUid(uid, displayName, mail);
    }
    vals = getCurrentOptions();

    // if (vals.size > 1) {
    if (testOptions(vals) == true) {
        errorShow(false);
    }
}

function wsCallbackUid(event, ui) {

    if (ui.item.category == 'users') {

        let uid = ui.item.uid;
        let displayName = ui.item.displayName;

        if (typeof ui.item.mail == "undefined") {
            alert("Le courriel de l'utilisateur " + ui.item.displayName + " étant absent, son entrée n'est pas ajoutée à la liste");
        } else {
            addOptionUid(uid, displayName, ui.item.mail);
        }
    }
    else if (ui.item.category == 'groups_structures' || ui.item.category == 'local') {
        $.ajax({
            url: urlwsgroupUserInfos,
            jsonp: "callback",
            data: { key: ui.item.key, CAS: true, filter_member_of_group: ui.item.key, filter_mail: "*", maxRows: 100, attrs: "uid,displayName"},
            dataType: 'jsonp',
            success: function (response) {
                let arrayUids = new Array();
                for (let obj of response) {
                    arrayUids.push(obj.uid);
                }
                setOptionsUid(arrayUids);
            }
        });
    }

    $('input#person').val('');

    return false;
}

function creneauSessionIdx(start, end, jsSessionInfos) {
    for (let key in jsSessionInfos) {
        let modalCreneauStart = jsSessionInfos[key].modalCreneau.modalCreneauStart;
        let modalCreneauEnd = jsSessionInfos[key].modalCreneau.modalCreneauEnd;
        let mstart = moment(modalCreneauStart);
        let mend = moment(modalCreneauEnd);
        if (start.diff(mstart) == 0 && end.diff(mend) == 0) {
            return key;
        }
    }
    return -1;
}

function objSessionIdx(jsSessionInfos, start, end, typeObj) {
    if (typeof jsSessionInfos != 'undefined') {
        if ((typeObj.zoom) || (typeObj.invite && typeObj.newParticipant)) {
            let key = creneauSessionIdx(start, end, jsSessionInfos);

            if (key !== -1) {
                return jsSessionInfos[key];
            }
        }
    }
    return null;
}

class bsModalShowZoom {
    constructor(jsSessionZoomInfos) {
        this.jsSessionZoomInfos = jsSessionZoomInfos;
        this.key = creneauSessionIdx(start, end, jsSessionZoomInfos);
        this.currentObj = (this.key !== -1) ? jsSessionZoomInfos[this.key] : null;
    }

    lieuCreneauUrlStr(url) {
        return "<a href='"+ url +"'>Lien zoom</a>";
    }

    lieuCreneauDiv(url) {
        return $("<p id='lieucreneau'>"+this.lieuCreneauUrlStr(url)+"</p>");
    }

    bsModalShowZoomDom() {
        if(this.currentObj != null) {
            $(titrecreneauSelector).val(this.currentObj.infos.titleEvent);
            $(summarycreneauSelector).val(this.currentObj.infos.descriptionEvent);

            let url = this.currentObj.data.join_url;
            $("#zoom").empty();
            $(zoomButtonSelector).empty();
            let urldiv = $('<div class="overflow-hidden">').append($('<a id="urlzooma" href="' + url + '">'+ url +'</a>'));

            let copySpan = $('<div id="copySpan" class="col-1 d-flex align-items-end"><span type="button" class="btn-clipboard" title="Copy to clipboard"><i class="bi bi-clipboard" aria-hidden="true"></i></span></div>');

            copySpan.on("click", function (event) {
                let cobj = $(this).children(2).children('i');
                cobj.removeClass('bi-clipboard');
                cobj.addClass('bi-check2');
                navigator.clipboard.writeText(url);
                event.preventDefault();
                event.stopPropagation();
            });
            $('#colLieu').removeClass('col').addClass('col-11');
            $('#lieucreneau').empty().append(urldiv);
            $('#lieucreneau').append('<input name="lieucreneau" hidden value="'+ url + '"/>');

            if ($('#copySpan').length == 0) {
                $('#colLieu').after(copySpan);
            }
        }
    }

    bsModalShowInvitationDOM(currentObj) {
        if (currentObj != null) {
            $(titrecreneauSelector).val(currentObj.infos.titleEvent);
            $(summarycreneauSelector).val(currentObj.infos.descriptionEvent);

            // Dirty Hack : trouver un moyen d'avoir un event zoom différemment que la recherche de https://panthe dans le lieu
            if ((currentObj.infos.lieuEvent.indexOf('https://pantheon')) != -1) {
                $(lieucreneauSelector).val(currentObj.infos.lieuEvent);
            }
        }

        let ul = $("#creneauMailParticipant_ul");
        ul.empty();
        listDisplayname.forEach(function(obj, uid) {
            let li=$('<li>');
            li.text(obj.displayName);
            if (currentObj != null && typeof currentObj.mails[uid] != 'undefined' && currentObj.mails[uid].sended == true) {
                li.append('<span class="bi bi-check2-circle"></span>');
            }
            ul.append(li);
        });
    }

    static bsModalShow() {
        let idxErr = isZoomError();
        if (idxErr != -1) {
            zoomClickError(zoomErrors[idxErr].msg);
            return;
        }

        $("#creneauBoxInput input[type='text'], #creneauBoxInput textarea, #creneauBoxInput button").attr('disabled', false);
        $("#creneauBoxInput input[type='text'], #creneauBoxInput textarea").attr('required', true);

        $("#creneauBoxInput ~ input[type='datetime-local']").attr('disabled', false);
        $("#creneauBoxInput ~ input[type='datetime-local']").attr('required', true);

        let currentInviteObj = objSessionIdx(jsSessionInviteInfos, start, end, {invite: true, newParticipant: newParticipant}); // objets courant à partir d'une variable jsSession définit dans l'index

        let objModal = new bsModalShowZoom(jsSessionZoomInfos);
        objModal.bsModalShowInvitationDOM(currentInviteObj);
        objModal.bsModalShowZoomDom();

        $(zoomButtonSelector).on('click', zoomClick);
    }

    static bsModalHide() {
        $('#zoom').empty().append(zoomElem);
        $("#lieucreneau").empty().append(lieuCreneauElem);
        $("#colLieu").empty().append(colLieu);
        $('#colLieu').removeClass('col-11');
        $('#colLieu').addClass('col');
        $('#copySpan').remove();
        $(zoomButtonSelector).on('click', zoomClick);

        $("#creneauBoxInput input[type='text'],#creneauBoxInput textarea,#creneauBoxInput button").attr('disabled', true);
        $("#creneauBoxInput input[type='text'],#creneauBoxInput textarea").attr('required', false);

        $("#creneauBoxInput ~ input[type='datetime-local']").attr('disabled', true);
        $("#creneauBoxInput ~ input[type='datetime-local']").attr('required', false);
    }
}

function formModalValidate() {
    let vals = getCurrentOptions();
    return testOptions(vals);
}

function onSubmit(event) {
    event.preventDefault();
    // change la valeur de l'input pour indiquer l'action à réaliser à la soumission du formulaire
    if (event.originalEvent.submitter.name == "submitModal") {
        $("input[name='actionFormulaireValider']").val("envoiInvitation");
        if (formInvitationCheck("Invitation") == false) {
            event.stopPropagation();
            return false;
        }
    }

    if (formModalValidate() == true) {
        this.submit();
    } else {
        errorShow(true);
    }
}

function textTimeStr(ts, te) {
    start = moment.unix(ts);
    end = moment.unix(te);

    return start.format('LL') + " de " + start.format('HH:mm').replace(':', 'h') + ' à ' + end.format('HH:mm').replace(':','h');
}

function onTimeClick() {
    let ts=$(this).attr("timestart");
    let te=$(this).attr("timeend");

    $('#creneauBoxDesc #creneauInfo').text(textTimeStr(ts, te));

    $("#creneauBoxInput ~ input[name='modalCreneauStart']").val(start.format(moment.HTML5_FMT.DATETIME_LOCAL));
    $("#creneauBoxInput ~ input[name='modalCreneauEnd']").val(end.format(moment.HTML5_FMT.DATETIME_LOCAL));

    if ($(this).attr('newParticipant').valueOf() == 'true') {
        newParticipant = true;
    }
    else {
        newParticipant = false;
    }
}

let isLoading = false;
let zoomErrors = [];

function isZoomError() {
    return zoomErrors.findIndex(o => o.start.unix()==start.unix() && o.end.unix()==end);
}

function zoomClickError(msg) {
    let zoom = $(zoomButtonSelector);
    let objCurrent = {'start': start, 'end': end, 'msg': msg};
    let idx=isZoomError();
    if (idx == -1) {
        zoomErrors.push(objCurrent);
    }

    objCurrent = zoomErrors.at(idx);
    objCurrent.msg = msg;

    zoom.removeClass('btn-secondary');
    zoom.removeClass('btn-success');
    zoom.addClass('bg-danger');
    zoom.text(msg);
}

function zoomClick() {

    if (formInvitationCheck("Zoom") == false) {
        return;
    }

    if (isLoading == true) {
        return;
    }
    isLoading = true;
    $("input[name='actionFormulaireValider']").val("zoomMeeting");

    let zoom = $(zoomButtonSelector);

    zoom.empty().append(`<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                     <span class="sr-only">En cours...</span>`);

    let datas = $("#form").serialize();
    $.ajax({
        type: "GET",
        url: "zoom.php",
        data: datas,
        dataType: "json",
        encode: true,
    }).done( (data) => {
        if (data.status == true) {
            let bsZoom;
                if (jsSessionZoomInfos==null) {
                jsSessionZoomInfos = [];
                    jsSessionZoomInfos[0]=data.zoomMeeting[0];
                jsSessionZoomInfos[0].data = data.data;
            } else {
                bsZoom = new bsModalShowZoom(jsSessionZoomInfos);
                if (bsZoom.currentObj == null) {
                        jsSessionZoomInfos.push(Object.assign({data: data.data}, data.zoomMeeting.at(-1)));
                } else {
                    jsSessionZoomInfos[bsZoom.key].data = data.data;
                }
            }
            bsZoom = new bsModalShowZoom(jsSessionZoomInfos);
            bsZoom.bsModalShowZoomDom();
        } else {
            zoomClickError(data.msg);
            }}).fail( (data) => {
                    zoomClickError(data.msg);
            }).always( () => {
                zoom.attr('disabled', true);
                isLoading=false;
            });
}

return {
    'listDisplayname': listDisplayname,
}
});
