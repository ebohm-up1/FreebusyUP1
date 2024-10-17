// création du slider pour la séléction des plages horaires
$(function() {    
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
            'max': [21]
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

    var sliderVals = slider.noUiSlider.get();

    // lien avec la sélection de la durée si les plages sont > 4h pour n'avoir qu'une "tranche" de séléction
    $("select#duree option").filter((_index, elem) => (elem.value > 240)).on('click', (event) => {
        valTest = slider.noUiSlider.get();

        // enregistre la valeure uniquement si on était sur une durée < 240 précedement
        sliderVals = ((parseFloat(valTest[1]) - parseFloat(valTest[0])) * 60 < 240) ? valTest : sliderVals;

        let intervalVal = parseFloat(valTest[0]) + (parseFloat(event.target.value) / 60);
        slider.noUiSlider.set([valTest[0], intervalVal, '23.00', '23.00']);
    });

    $("select#duree option").filter((_index, elem) => (elem.value <= 240)).on('click',() => slider.noUiSlider.set((new Set(sliderVals).size === sliderVals.length) ? sliderVals: [sliderVals[0],12,14,17]));
});
