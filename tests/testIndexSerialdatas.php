<?php

declare(strict_types=1);

namespace RechercheCreneaux;

use DateTime;
use stdClass;
use Exception;
use DateInterval;
use Dotenv\Dotenv;
use phpCAS;
use IntlDateFormatter;
use RechercheCreneaux\FBParams;
use RechercheCreneaux\FBForm;
use RechercheCreneaux\FBUtils;
use RechercheCreneaux\FBInvite;
use RechercheCreneaux\FBCompare;
use RechercheCreneaux\TypeInviteAction;

require '../vendor/autoload.php';

session_start();

$stdEnv = unserialize(file_get_contents('FBCompareTest-1/stdenv.json'));

$fbParams = unserialize(file_get_contents('FBCompareTest-1/fbparams.json'));

if (FBForm::validParams($fbParams)) {
    $js_uids = json_encode($fbParams->uids);

    $fbForm = new FBForm($fbParams, $stdEnv);
    // $fbForm = unserialize(file_get_contents('tests/fbform.json'));

    // $reFbForm = new \ReflectionObject($fbForm);
    // $fbUsers = $reFbForm->getProperty('fbUsers')->getValue($fbForm);
    // $creneauxGenerated = $reFbForm->getProperty('creneauxGenerated')->getValue($fbForm);

    // $fbCompare = new FBCompare($fbUsers, $creneauxGenerated, $stdEnv->dtz, $fbParams->nbcreneaux);
    // $fbForm->setFbCompare($fbCompare);

    $nbResultatsAffichés = $fbForm->getFbCompare()->getNbResultatsAffichés();

    if ($nbResultatsAffichés == 0 && sizeof($fbForm->getFbUsers()) > 2) {
        $fbUserSortNbs = array_reverse(FBUtils::sortFBUsersByBusyCount(... $fbForm->getFbUsers()));

        if (!is_null($stdNewFBCompare = FBCompare::algo_search_results($fbUserSortNbs, $fbForm->getCreneauxGenerated(), $stdEnv->dtz, $fbParams->nbcreneaux))) {
            $fbForm->setFbCompare($stdNewFBCompare->fbCompare);
            $fbUsersUnsetted = $stdNewFBCompare->fbUsersUnsetted;
            $nbResultatsAffichés = $fbForm->getFbCompare()->getNbResultatsAffichés();
        }
    }

    $creneauxFinauxArray = $fbForm->getFbCompare()->getArrayCreneauxAffiches();

    $listDate = array();
    for ($i = 0; $i < $nbResultatsAffichés; $i++) {
        $creneauTmp = $creneauxFinauxArray[$i];

        $listDate[] = $creneauxFinauxArray[$i];
    }

    if ($fbForm->invitationProcess($listDate)) {
        $jsonSessionInfos = $fbForm->fbParams->jsonSessionInfos;
    }
}
?>

<!DOCTYPE html>

<head>
    <?php if (is_null($stdEnv->prolongationEntJs) === false && is_null($stdEnv->prolongationEntArgsCurrent) === false && ($_SERVER['HTTP_HOST'] === 'localhost') === false) : ?>
        <script>
            window.prolongation_ENT_args = {
                current: '<?= $stdEnv->prolongationEntArgsCurrent ?>',
                delegateAuth: true
            };
        </script>
        <script src="<?= $stdEnv->prolongationEntJs ?>"></script>
    <?php endif ?>

    <link href="./css/bootstrap.min.css" rel="stylesheet" />
    <script src="./js/bootstrap.bundle.min.js"></script>

    <script src="./js/jquery.min.js"></script>
    <script type='text/javascript' src="https://wsgroups.univ-paris1.fr/web-widget/autocompleteUser-resources.html.js"></script>

    <link href="./css/form.css" rel="stylesheet" />
    <script type='text/javascript' src='./js/form.js'></script>

    <link href="./css/nouislider.min.css" rel="stylesheet" />
    <script src="./js/nouislider.min.js"></script>

    <script src="./js/min/moment.min.js"></script>
    <script src="./js/min/moment-with-locales.js"></script>
</head>

<body>
        <form id="form" class="container" action="">
            <input type="hidden" name="actionFormulaireValider" value="rechercheDeCreneaux" />
                    <div class="row">
                        <div class="col">
                            <p>Séléction des utilisateurs</p>
                            <input id="person" name="person" placeholder="Nom et/ou prenom" />

                            <script>
                                var jsduree = <?= (is_null($fbParams->duree) ? 60 : $fbParams->duree); ?>;
                                var urlwsgroupUserInfos = '<?= $stdEnv->urlwsgroupUserInfos; ?>';
                                var urlwsgroupUsersAndGroups = '<?= $stdEnv->urlwsgroupUsersAndGroups; ?>';
                                var urlwsphoto = '<?= $stdEnv->urlwsphoto; ?>';

                                <?php if (isset($fbParams->duree) && !is_null($fbParams->duree)) : ?>
                                    $(function() {
                                        $('#duree option[value="<?= $fbParams->duree ?>"').prop('selected', true);
                                    });
                                <?php endif ?>

                                <?php if ($fbParams->uids && isset($js_uids)) : ?>
                                    var jsuids = <?= "$js_uids" ?>;

                                    $(function() {
                                        setOptionsUid(jsuids);

                                        if (jsuids.length < 2) {
                                            errorShow(true);
                                        }
                                    });
                                <?php endif ?>
                                <?php if (isset($jsonSessionInfos)): ?>
                                    var jsSessionInfos=JSON.parse('<?= $jsonSessionInfos ?>');
                                <?php endif ?>
                            </script>
                        </div>
                        <div class="col">
                            <p>Nombre de créneaux</p>
                            <input id="creneaux" name="creneaux" type="number" value="<?php print($fbParams->nbcreneaux ? $fbParams->nbcreneaux : 3) ?>" />
                        </div>
                        <div class="col">
                            <p>Durée des créneaux</p>

                            <select id="duree" name="duree" required=true>
                                <option value="30"<?= ($fbParams->duree == 30) ? ' selected':'' ?>>30 minutes</option>
                                <option value="60"<?= ($fbParams->duree == 60 || is_null($fbParams->duree)) ? ' selected':'' ?>>1h</option>
                                <option value="90"<?= ($fbParams->duree == 90) ? ' selected':'' ?>>1h30</option>
                                <option value="120"<?= ($fbParams->duree == 120) ? ' selected':'' ?>>2h</option>
                                <option value="150"<?= ($fbParams->duree == 150) ? ' selected':'' ?>>2h30</option>
                                <option value="180"<?= ($fbParams->duree == 180) ? ' selected':'' ?>>3h</option>
                                <option value="210"<?= ($fbParams->duree == 210) ? ' selected':'' ?>>3h30</option>
                                <option value="240"<?= ($fbParams->duree == 240) ? ' selected':'' ?>>4h</option>
                            </select>
                        </div>
                        <div class="col-2">
                            <p>Envoyer requête</p>
                            <input class="btn btn-sm btn-primary rounded" type="submit" name="submitRequete" value="Recherche de disponibilité" />
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-4">
                            <div id="divpersonselect">
                                <br />
                                <p>Utilisateurs sélectionnés</p>
                                <p class="alertrequire">Séléction minimum de 2 utilisateurs non optionnels</p>
                                <ul id="person_ul" class="px-0">
                                </ul>
                            </div>
                        </div>
                        <div class="col-6">
                            <div id="divjours">
                                <p>Jours séléctionnés</p>
                                <fieldset>
                                    <input type="checkbox" name="joursCreneaux[]" value="MO" <?php if (in_array('MO', $fbParams->joursDemandes)) echo 'checked' ?>>Lundi</input>
                                    <input type="checkbox" name="joursCreneaux[]" value="TU" <?php if (in_array('TU', $fbParams->joursDemandes)) echo 'checked' ?>>Mardi</input>
                                    <input type="checkbox" name="joursCreneaux[]" value="WE" <?php if (in_array('WE', $fbParams->joursDemandes)) echo 'checked' ?>>Mercredi</input>
                                    <input type="checkbox" name="joursCreneaux[]" value="TH" <?php if (in_array('TH', $fbParams->joursDemandes)) echo 'checked' ?>>Jeudi</input>
                                    <input type="checkbox" name="joursCreneaux[]" value="FR" <?php if (in_array('FR', $fbParams->joursDemandes)) echo 'checked' ?>>Vendredi</input>
                                </fieldset>
                                <br />
                            </div>
                            <div id="divplagehoraire">
                                <p>Plage horaire</p>
                                <div id="slider"></div>
                                <input type='hidden' name="plagesHoraires[]" value="<?= $fbParams->plagesHoraires[0]; ?>" />
                                <input type='hidden' name="plagesHoraires[]" value="<?= $fbParams->plagesHoraires[1]; ?>" />
                            </div>
                        </div>
                        <div class="col-2 d-inline-flex flex-column justify-content-center">
                                <p>A partir du</p>
                                <input class="col-7" required type="date" name="fromDate" min="<?= (new DateTime())->format('Y-m-d') ?>" max="<?= (new DateTime())->add(new DateInterval('P120D'))->format('Y-m-d') ?>" value="<?= $fbParams->fromDate; ?>" />
                        </div>
                    </div>

            <!-- Modal -->
            <div class="modal fade" id="creneauMailInput" tabindex="-1" aria-labelledby="modalInputLabel" aria-hidden="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <p>Envoi invitation aux participants</p>
                        </div>
                        <div class="row">
                            <div class="col-6" id="creneauBoxDesc">
                                <p>Créneau</p>
                                <span id="creneauInfo" class="text-nowrap text-break"></span>
                                <hr>
                                <p>Participants</p>
                                <ul id="creneauMailParticipant_ul" />
                            </div>
                            <div class="col-5 align-content-between" id="creneauBoxInput">
                                <label for="titrecreneau">Titre de l'évenement</label>
                                <input id="titrecreneau" type="text" disabled placeholder="Titre de l'évenement" name="titrecreneau" value="<?= $fbParams->titleEvent; ?>" oninvalid="this.setCustomValidity('Veuillez renseigner un titre pour l\'évenement')" onchange="if(this.value.length>0) this.setCustomValidity('')" />
                                <label for="summarycreneau">Description :</label>
                                <textarea id="summarycreneau" disabled placeholder="Description de l'évenement" name="summarycreneau" value="<?= $fbParams->descriptionEvent; ?>" oninvalid="this.setCustomValidity('Veuillez renseigner une description pour l\'évenement')" onchange="if(this.value.length>0) this.setCustomValidity('')"><?= $fbParams->descriptionEvent; ?></textarea>
                                <label for="lieucreneau">Lieu :</label>
                                <input id="lieucreneau" type="text" disabled placeholder="Lieu de l'évenement" name="lieucreneau" value="<?= $fbParams->lieuEvent; ?>" oninvalid="this.setCustomValidity('Veuillez renseigner un lieu pour l\'évenement')" onchange="if(this.value.length>0) this.setCustomValidity('')" />
                            </div>
                            <input type="datetime-local" disabled hidden="hidden" name="modalCreneauStart" />
                            <input type="datetime-local" disabled hidden="hidden" name="modalCreneauEnd" />
                        </div>
                        <div class="modal-footer" id="creneauBoxFooter">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fermer</button>
                            <input type="submit" class="btn btn-primary" name="submitModal" value="Envoyer" />
                        </div>
                    </div>
                </div>
            </div>
        </form>

    <?php
    if (isset($fbParams->listUidsOptionnels) && sizeof($fbParams->listUidsOptionnels) > 0) {
        echo '<script>var jsListUidsOptionnels='. json_encode($fbParams->listUidsOptionnels) . ';</script>';
    }
    ?>
    <div id="reponse" class="container my-4">
    <?php if (isset($fbForm)) : ?>
        <?php if ($fbUsersUnsetted = $fbForm->getFBUsersDisqualifierOrBloquer()): ?>
            <?php $txtFailParticipants = "La recherche de créneaux sur tous les participants ayant échouée, les participants suivants sont exclus de la recherche dans le but de vous présenter un résultat"; ?>
            <div class='shadow p-3 mb-5 bg-body rounded lead'>
                <p><?= $txtFailParticipants ?></p>
                <ul>
                    <?php foreach ($fbUsersUnsetted as $fbUser): ?>
                        <li><?= $fbUser->getUidInfos()->displayName ?></li>
                    <?php endforeach ?>
                </ul>
            </div>
        <?php endif ?>
    <?php endif ?>

    <?php if (isset($listDate) && sizeof($listDate) == 0) : ?>
            <p>Aucun créneaux commun disponible pour ces utilisateurs</p>
    <?php elseif (isset($listDate) && sizeof($listDate) > 0) : ?>
        <?php
        $formatter_day =  IntlDateFormatter::create('fr_FR', IntlDateFormatter::FULL, IntlDateFormatter::FULL, date_default_timezone_get(), IntlDateFormatter::GREGORIAN, "EEEE");
        $formatter_start = IntlDateFormatter::create('fr_FR', IntlDateFormatter::FULL, IntlDateFormatter::FULL, date_default_timezone_get(), IntlDateFormatter::GREGORIAN, "dd/MM/yyyy HH'h'mm");
        $formatter_end = IntlDateFormatter::create('fr_FR', IntlDateFormatter::FULL, IntlDateFormatter::FULL, date_default_timezone_get(), IntlDateFormatter::GREGORIAN, "HH'h'mm") ?>
            <p>Créneaux disponibles</p>
            <ul class="col-11">
                <?php foreach ($listDate as $date) : ?>
                    <li class="row">
                        <time class="col-5"><span class="d-inline-block col-2"><?= $formatter_day->format($date->startDate->getTimestamp()) ?></span> <?= $formatter_start->format($date->startDate->getTimestamp()) . ' - ' . $formatter_end->format($date->endDate->getTimestamp()) ?></time>
                        <?php if (($invitationFlag = FBInvite::invitationDejaEnvoyeSurCreneau($date, $fbForm->getFbUsers()))->typeInvationAction != TypeInviteAction::New) : ?>
                            <div class='col-1 px-0 invitationEnvoyée' data-toggle="tooltip" data-html="true" data-bs-placement="right" title="<?= FBUtils::formTooltipEnvoyéHTML($invitationFlag->mails) ?>">
                                <span class="text-success">Envoyé</span>
                                <svg class="bi bi-check2-circle d-inline-block" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="green" viewBox="0 0 16 16">
                                    <path d="M2.5 8a5.5 5.5 0 0 1 8.25-4.764.5.5 0 0 0 .5-.866A6.5 6.5 0 1 0 14.5 8a.5.5 0 0 0-1 0 5.5 5.5 0 1 1-11 0z" />
                                    <path d="M15.354 3.354a.5.5 0 0 0-.708-.708L8 9.293 5.354 6.646a.5.5 0 1 0-.708.708l3 3a.5.5 0 0 0 .708 0l7-7z" />
                                </svg>
                            </div>
                        <?php endif ?>
                        <?php if ($invitationFlag->typeInvationAction == TypeInviteAction::New): ?>
                            <a href="#" class="col px-0" data-bs-toggle="modal" data-bs-target="#creneauMailInput" newParticipant="false" timeStart="<?= $date->startDate->getTimestamp() ?>" timeEnd="<?= $date->endDate->getTimestamp() ?>">Envoyer une invitation aux participants</a>
                        <?php elseif ($invitationFlag->typeInvationAction == TypeInviteAction::NewParticipants): ?>
                            <a href="#" class="col px-0" data-bs-toggle="modal" data-bs-target="#creneauMailInput" newParticipant="true" timeStart="<?= $date->startDate->getTimestamp() ?>" timeEnd="<?= $date->endDate->getTimestamp() ?>">Envoyer une invitation aux nouveaux participants</a>
                        <?php endif ?>
                    </li>
                <?php endforeach ?>
            </ul>
        <?php endif ?>
    </div>
</body>

</html>