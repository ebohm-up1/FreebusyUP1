let divpersonselect = "#divpersonselect";
let idperson_ul = "#person_ul";
let listDisplayname = new Map();

function errorShow(toShow) {
    if (toShow === true) {
        if ($(divpersonselect).is(":hidden"))
            $(divpersonselect).show();
        $(divpersonselect + " .alertrequire").css('display', 'inherit');
    }
    if (toShow === false) {
        $(divpersonselect + " .alertrequire").css('display', 'none');
    }
}

function getCurrentOptions() {
    let getVals = new Array();

    $(idperson_ul + " li input").each(function (idx, option) {
        getVals[idx] = option.value;
    });

    return getVals;
}

function setOptionsUid(jsuids) {
    for (uid of jsuids) {
        $.ajax({
            url: urlwsgroup,
            jsonp : "callback",
            data: {'token' : uid, 'maxRows' : 1, 'attrs' : "uid,displayName"},
            dataType: 'jsonp',
            success: function (response) {
                addOptionWithUid(response[0].uid, response[0].displayName);
            }
        });
    }
}

function addOptionWithUid(uid, displayName) {
    listDisplayname.set(uid, displayName);

    if ($(divpersonselect).is(":hidden"))
        $(divpersonselect).show();

    let newLi = $('<li>');
    let label = $('<input>');
    label.attr('type', 'checkbox').attr('name', 'listuids[]').attr('multiple', true).attr('checked', true).val(uid).css('display', 'none');

    newLi.append(label);
    newLi.append(displayName);

    let button = $('<button>').text('supprimer');

    newLi.append(button);

    let optionnel = $('<input>');
    optionnel.attr('name', 'listUidsOptionnels[]').attr('type', 'checkbox').attr('class', 'form-check-input,form-participant-optionnel');

    if (typeof jsBlockUids != 'undefined') {
        for (uidBlock of jsBlockUids) {
            if (uidBlock == uid) {
                optionnel.attr('checked', true);
            }
        }
    }

    newLi.append(optionnel);
    // newLi.append('<input name="listUidsOptionnels[]" type="checkbox" class="form-check-input,form-participant-optionnel" />');
    newLi.append('<label class="form-check-label" for="form-participant-optionnel">Participant optionnel</label>');

    $(idperson_ul).append(newLi);

    button.on("click", function () {
        $(this).parent().remove();

        let optnb = getCurrentOptions();

        if (optnb.length === 0)
            $(divpersonselect).hide();
        if (optnb.length < 2) 
            errorShow(true);
    });
}

function addOptionUid(uid, displayName) {
    //let uid=this.value;
    let vals = getCurrentOptions();
    if (vals.indexOf(uid) === -1) {
        addOptionWithUid(uid, displayName);
    }
    vals = getCurrentOptions();
    if (vals.length > 1) {
        errorShow(false);
    }
}

function wsCallbackUid(event, ui) {

    let uid = ui.item.uid;
    let displayName = ui.item.displayName;

    addOptionUid(uid, displayName);

    $(event.target).val('');

    return false;
}

$(function() {
    $("#person").autocompleteUser(
            urlwsgroup, {
                select: wsCallbackUid,
                wantedAttr: "uid"
            }
    );

    $("#form").on("submit", function (event) {
        event.preventDefault();
        // change la valeur de l'input pour indiquer l'action à réaliser à la soumission du formulaire
        if (event.originalEvent.submitter.name == "submitModal") {
            $("input[name='actionFormulaireValider']").val("envoiInvitation");
        }

        let vals = getCurrentOptions();

        if (vals.length > 1) {
            this.submit();
            return true;
        } else {
            errorShow(true);
            return false;
        }
    });

    $('#divpersonselect').hide();

    let slider = document.getElementById('slider');

    let selectorPlagesHoraires = "input:hidden[name='plagesHoraires[]']";
    let p1a = $(selectorPlagesHoraires)[0].value.split('-');
    let p2a = $(selectorPlagesHoraires)[1].value.split('-');

    let formatter = function(valueString) {
                        if (valueString.search('H30') != -1) {
                            return Number(valueString.replace('H30', '.5'));
                        }
                        if (valueString.search('H00') != -1){
                            return Number(valueString.replace('H00', ''));
                        }
                        if (valueString.search('H') != -1){
                            return Number(valueString.replace('H', ''));
                        }
                        return Number(valueString);
                    };

    let plagesStrings = p1a.concat(p2a);

    let arrayStart = Array();
    for (plage of plagesStrings) {
        arrayStart.push(formatter(plage));
    }

// création du slider pour la séléction des plages horaires
    noUiSlider.create(slider, {
        start: arrayStart,
        step: 0.5,
        connect: [false, true, false, true, false],
        tooltips: {
            to: function(value) {
                if (value % 1 != 0) {
                    let valueEntier = value - 0.5;
                    return valueEntier + "H30";
                }
                else {
                    return value + "H00";
                }
            },
            from: formatter
        },
        range: {
            'min': [7],
            'max': [20]
        }
    });

    slider.noUiSlider.on('update', function (arrayValues) {

        if (arrayValues[0] == "NaN")
            return;

        inputFirst = $(selectorPlagesHoraires).first();
        inputSecond = $(selectorPlagesHoraires).last();

        idx = 0;
        for (value of arrayValues) {
            if (Number(value) % 1 != 0)
                valueStrNew = value.replace('.50', 'H30');
            else
                valueStrNew = value.replace('.00', 'H00');

            if (idx < 2)
                input = inputFirst;
            else
                input = inputSecond;
            if (idx % 2 == 0)
                valueComplete = valueStrNew + "-";
            else
                input.val(valueComplete.concat(valueStrNew));
            idx++;
        }
    });

    function rechercheCreaneauGetIdx(start, end, jsSessionInfos) {
        for (key in jsSessionInfos) {
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

    let newParticipant=false;
    let start=null;
    let end=null;

    $("#reponse li a").on("click", function() {
        let ts=$(this).attr("timestart");
        let te=$(this).attr("timeend");

        start = moment.unix(ts);
        end = moment.unix(te);

        $('#creneauBoxDesc #creneauInfo').text(start.format('LL') + " de " + start.format('HH:mm').replace(':', 'h') + ' à ' + end.format('HH:mm').replace(':','h'));

        $("#creneauBoxInput ~ input[name='modalCreneauStart']").val(start.format(moment.HTML5_FMT.DATETIME_LOCAL));
        $("#creneauBoxInput ~ input[name='modalCreneauEnd']").val(end.format(moment.HTML5_FMT.DATETIME_LOCAL));

        if ($(this).attr('newParticipant').valueOf() == 'true') {
            newParticipant = true;
        }
        else {
            newParticipant = false;
        }
    });

    // Set FR pour le formattage des dates avec la librairie moment.js
    moment.locale('fr');

    $('#creneauMailInput').on('shown.bs.modal', function () {
        $("#creneauBoxInput > input[type='text'],textarea").attr('disabled', false);
        $("#creneauBoxInput > input[type='text'],textarea").attr('required', true);

        $("#creneauBoxInput ~ input[type='datetime-local']").attr('disabled', false);
        $("#creneauBoxInput ~ input[type='datetime-local']").attr('required', true);

        let currentObj=null; // objets courant à partir de jsSessionInfos
        if (newParticipant == true) {
            let key = rechercheCreaneauGetIdx(start, end, jsSessionInfos);
            if (key !== -1) {
                currentObj = jsSessionInfos[key];
                $('#titrecreneau').val(currentObj.infos.titleEvent);
                $('#summarycreneau').val(currentObj.infos.descriptionEvent);
                $('#lieucreneau').val(currentObj.infos.lieuEvent);
            }
        }
        ul = $("#creneauMailParticipant_ul");
        ul.empty();
        listDisplayname.forEach(function(displayName, uid) {
            let li=$('<li>');
            li.text(displayName);
            if (currentObj != null && typeof currentObj.mails[uid] != 'undefined' && currentObj.mails[uid].sended == true) {
                li.append(' <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="green" class="bi bi-check2-circle" viewBox="0 0 16 16"><path d="M2.5 8a5.5 5.5 0 0 1 8.25-4.764.5.5 0 0 0 .5-.866A6.5 6.5 0 1 0 14.5 8a.5.5 0 0 0-1 0 5.5 5.5 0 1 1-11 0z"></path><path d="M15.354 3.354a.5.5 0 0 0-.708-.708L8 9.293 5.354 6.646a.5.5 0 1 0-.708.708l3 3a.5.5 0 0 0 .708 0l7-7z"></path>');
            }
            ul.append(li);
        });
    });

    $('#creneauMailInput').on('hidden.bs.modal', function () {
        $("#creneauBoxInput > input[type='text'],textarea").attr('disabled', true);
        $("#creneauBoxInput > input[type='text'],textarea").attr('required', false);

        $("#creneauBoxInput ~ input[type='datetime-local']").attr('disabled', true);
        $("#creneauBoxInput ~ input[type='datetime-local']").attr('required', false);
    });
});
