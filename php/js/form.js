var urlwsgroup = 'https://wsgroups.univ-paris1.fr/searchUser';
var divpersonselect = "#divpersonselect";
var idperson_ul = "#person_ul";

function errorShow(toShow) {
    if (toShow === true) {
        $(".alertrequire").css('display', 'inherit');
    }
    if (toShow === false) {
        $(".alertrequire").css('display', 'none');
    }
}

function getCurrentOptions() {
    var getVals = new Array();

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

    if ($(divpersonselect).is(":hidden"))
        $(divpersonselect).show();

    var newLi = $('<li>');
    var label = $('<input>');
    label.attr('type', 'checkbox').attr('name', 'listuids[]').attr('multiple', true).attr('checked', true).val(uid).css('display', 'none');

    newLi.append(label);
    newLi.append(displayName);

    var button = $('<button>').text('supprimer');

    newLi.append(button);
    $(idperson_ul).append(newLi);

    button.on("click", function () {
        $(this).parent().remove();

        var optnb = getCurrentOptions();

        if (optnb.length === 0)
            $(divpersonselect).hide();
        if (optnb.length < 2) 
            errorShow(true);
    });
}

function addOptionUid(uid, displayName) {
    //var uid=this.value;
    var vals = getCurrentOptions();
    if (vals.indexOf(uid) === -1) {
        addOptionWithUid(uid, displayName);
    }
    vals = getCurrentOptions();
    if (vals.length > 1) {
        errorShow(false);
    }
}

function wsCallbackUid(event, ui) {

    var uid = ui.item.uid;
    var displayName = ui.item.displayName;

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

    $("#form").on("submit", function (e) {
        e.preventDefault();

        var vals = getCurrentOptions();

        if (vals.length > 1)
            this.submit();
        else
            errorShow(true);
    });

    $('#divpersonselect').hide();

    var slider = document.getElementById('slider');

    var selectorPlagesHoraires = "input:hidden[name='plagesHoraires[]']";
    var p1a = $(selectorPlagesHoraires)[0].value.split('-');
    var p2a = $(selectorPlagesHoraires)[1].value.split('-');

// création du slider pour la séléction des plages horaires
    noUiSlider.create(slider, {
        start: p1a.concat(p2a),
        step: 1,
        connect: [false, true, false, true, false],
        tooltips: {
            to: function(valueString) {
                return valueString + "H00";
            },
        },
        range: {
            'min': [7],
            'max': [20]
        }
    });

    slider.noUiSlider.on('update', function (arrayValues) {
        p1val = arrayValues[0].replace('.00', '') + "-" + arrayValues[1].replace('.00', '');
        p2val = arrayValues[2].replace('.00', '') + "-" + arrayValues[3].replace('.00', '');
        $(selectorPlagesHoraires).first().val(p1val);
        $(selectorPlagesHoraires).last().val(p2val);
    });

});