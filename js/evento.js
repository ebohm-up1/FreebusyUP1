$(function() {
    $('#eventoSubmit').on("click", () => {
        $("#eventoSubmit").removeAttr("formnovalidate");
        if (eventoFormCheck() == false) {
            return;
        }

        $('#modalEvento').modal('hide');
        $('#spinnerEvento').modal('show');

        let titre = $("input[name='titrevento']").val();
        let desc = $("textarea[name='summaryevento']").val();

        let isNotif = $('#NotifEvento').is(':checked');
        let isAuth = $('#AuthEvento').is(':checked');

        let id = isEventoSession ? idEvento : false;

        let path = id ? urlEvento : false;

        let dataPost = eventoDatasRequest({id: id, path: path, titre: titre, desc: desc, isNotif: isNotif, isAuth: isAuth});

        let url = eventoWsUrl + "survey";
        if (id) {
            url = url + "/" + id;
        }
        eventoAjaxSurvey(dataPost, (id == false) ? 'POST' : 'PUT', url);
    });
});

function eventoDatasRequest(args) {

    let idxChecked = $('#modalEventoCreneaux li > input:checked');

    let questions = [];

    idxChecked.each(() =>  {
        // l'index commence à 0 ...
        let idx = Number(this.value) + 1;
        let select = $("#listReponse li:nth-child("+ idx +") a");
        questions.push({'timestart': select.attr('timestart'), timeend: select.attr('timeend')});
    });

    let jsonData = Object.assign({}, eventoDraftBase);
    let propositionBase = Object.assign({}, jsonData.questions[0].propositions[0]);

    jsonData.title = args.titre;
    jsonData.description = args.desc;

    jsonData.id = args.id ? args.id : "";
    jsonData.path = args.path ? args.path : "";

    args.isAuth ? jsonData.settings.enable_anonymous_answer = 0 : jsonData.settings.enable_anonymous_answer = 1;
    args.isAuth ? jsonData.settings.reply_access = "opened_to_authenticated" : jsonData.settings.reply_access = "opened_to_everyone";

    args.isNotif ? jsonData.notify_new_guests = true : jsonData.notify_new_guests = false;
    args.isNotif ? jsonData.notify_update = true : jsonData.notify_update = false;

    let lastQEndTs = questions[questions.length - 1].timeend;
    jsonData.settings.auto_close = moment(moment.unix(lastQEndTs).add('1','day')).unix();

    let insertProposition = [];
    for (const question of questions) {
        let timestart = question.timestart;
        let timeend = question.timeend;

        let base_day = moment(moment.unix(timestart).format('Y-M-D') + ' 00:00:00', 'YYYY-M-D').unix();
        // dirty hack pour faire correspondre les bonnes infos sur evento
        base_day = base_day + (3600*24);
        let local_base_day = base_day + (3600*2);

        let propose = Object.assign({}, propositionBase);

        propose.base_day = base_day;
        propose.local_base_day = local_base_day;
        propose.base_time = timestart - local_base_day;
        propose.end_time = timeend - local_base_day;
        propose.label = moment.unix(base_day).format('LLLL').replace(' 00:00', '') + ' de ' + moment.unix(timestart).format('HH:mm').replace(':','H') + ' à ' + moment.unix(timeend).format('HH:mm').replace(':','H');

        insertProposition.push(propose);
    }
    jsonData.questions[0].propositions = insertProposition;

    jsonData.guests = [];
    jsonData.new_guests = [];

    if (jsonData.notify_new_guests == true) {
        listDisplayname.forEach((datas) => {
            jsonData.new_guests.push(datas.mail);
            jsonData.guests.push({email:datas.mail,name:datas.displayName});
        });
    }

    return jsonData;
}

function eventoAjaxSurvey(datas, type, url) {
   let id = false;

    $.ajax({
        url: url, 
        type: type,
        contentType: 'application/json',
        data: JSON.stringify(datas),
        crossDomain: true,
        xhrFields: {withCredentials: true},
        done: () => console.log('done'),
        fail: () => console.log('fail'),
        success: (response) => {
            console.log("success");
            if (typeof(response.path)!= 'undefined') {

                if (response.data.path.indexOf('https://evento') != -1 && response.data.path.indexOf('/survey/') != -1) {
                    let urlEvento = response.data.path.replace('renater', 'univ-paris1');

                    let div = $('#eventoDiv');
                    div.empty().append("<a href='" + urlEvento + "' target='_blank'>" + urlEvento + "</a>");

                    let copySpan = $('<span type="button" class="btn-clipboard d-inline px-2" title="Copier le lien"><i class="bi bi-clipboard" aria-hidden="true"></i></span>');

                    copySpan.on("click", () => {
                        $(this).children().removeClass('bi-clipboard').addClass("bi-check2");
                        navigator.clipboard.writeText(urlEvento);
                    });

                    div.append(copySpan);

                    // si la notification des participants est désactivée, ajout des infos participants aux données envoyés pour le stockage session des eventos
                    if (datas.notify_new_guests == false) {
                        listDisplayname.forEach((elem) => {
                            datas.new_guests.push(elem.mail);
                            datas.guests.push({email:elem.mail,name:elem.displayName});
                        });
                    }

                    // ajout des paramètre de la réponse ajax aux données envoyés à l'enregistrement de la session
                    datas.id = response.data.id;
                    datas.path = urlEvento;
                    $.get('dumb_evento_up.php', datas);

                    let titre = $("input[name='titrevento']").val();
                    let desc = $("textarea[name='summaryevento']").val();

                    // ajout d'un input hidden pour passer le titre et la description en paramètre
                    if ($("#form input[name='eventoTitre']").length == 0) {
                        $("#form").append($("<input type='hidden' name='eventoTitre' value='"+ titre +"'>"));
                    } else {
                       $("#form input[name='eventoTitre']").val(titre);
                    }

                    if ($("#form input[name='summaryevento']").length == 0) {
                        $("#form").append($("<input type='hidden' name='summaryevento' value='"+ desc +"'>"));
                    } else {
                       $("#form input[name='summaryevento']").val(desc);
                    }
                }
            }
        },
        complete: () => {
            console.log('complete');
            $(".modal-backdrop").remove();
            $('#spinnerEvento').hide();
        }});

    return id;
}

function eventoFormCheck() {
    let titreSel = $("input[name='titrevento']");
    if (titreSel.val().length == 0) {
        $("input[name='titrevento']").get(0).setCustomValidity(true);
        $("input[name='titrevento']").get(0).reportValidity();
        return false;
    } else {
        $("input[name='titrevento']").get(0).setCustomValidity('');
    }

    let descSel = $("textarea[name='summaryevento']");
    if (descSel.val().length == 0) {
        $("textarea[name='summaryevento']").get(0).setCustomValidity(true);
        $("textarea[name='summaryevento']").get(0).reportValidity();
        return false;
    } else {
       $("textarea[name='summaryevento']").get(0).setCustomValidity('');
    }

    return true;
}

function eventoCheck() {
    let evento = $('#eventoSubmit');

    let selector = $('#modalEventoCreneaux li > input:checked');

    if (selector.length == 0) {
        evento.attr('disabled', 'disabled');
        if (evento.hasClass('btn-success')) {
            evento.removeClass('btn-success');
        }
        evento.addClass('btn-secondary');
    } else {
        evento.removeAttr('disabled');
        if (evento.hasClass('btn-secondary')) {
            evento.removeClass('btn-secondary');
        }
        evento.addClass('btn-success');
    }
}