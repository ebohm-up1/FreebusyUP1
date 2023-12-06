<?php
declare(strict_types=1);

use League\Period\Period as Period;

enum TypeInviteAction : int {
    case New = -1;
    case Exist = 0;
    case NewParticipants = 1;
}

class FBInvite {
    var $listUserInfos;
    var $listDate;
    var $modalCreneauStart;
    var $modalCreneauEnd;
    var $titleEvent;
    var $descriptionEvent;
    var $lieuEvent;
    var $dtz;
    var $sujet = "Invitation évenement";

    var $varsHTTPGet;
    var array $stdMails;
    var $mailEffectivementEnvoye = false;
    var $mailEffectivementEnvoyeKey;
    var $mailEffectivementEnvoyeUids;
    var string $from;

    public function __construct(array $fbUsers, $modalCreneauStart, $modalCreneauEnd, $titleEvent, $descriptionEvent, $lieuEvent, $dtz, $listDate, $varsHTTPGet) {
        $this->listDate = $listDate;
        $this->modalCreneauStart = $modalCreneauStart;
        $this->modalCreneauEnd = $modalCreneauEnd;
        $this->varsHTTPGet = $varsHTTPGet;
        $this->titleEvent = $titleEvent;
        $this->descriptionEvent = $descriptionEvent;
        $this->lieuEvent = $lieuEvent;
        $this->dtz = $dtz;

        // recupere les infos venant des $fbUsers et converti les stdObj en array
        $this->listUserInfos = $this->_getUserinfos($fbUsers);

// considère le premier user comme l'organisateur ... TODO : prendre en compte l'utilisateur connecté à ent
        $this->from = $fbUsers[0]->getUidInfos()->mail;
        $this->stdMails = array();
    }

    private function _genereParametresMail($userinfo) {
        $userinfo = (object) $userinfo;

        $icsData = FBUtils::icalCreationInvitation($this->listUserInfos, $this->modalCreneauStart, $this->modalCreneauEnd, $this->titleEvent, $this->descriptionEvent, $this->lieuEvent, $this->dtz);

        $boundary = uniqid('boundary');

        $from = "From: {$this->from}";
        $to = "To: {$userinfo->mail}";

        $header = "$from".PHP_EOL."$to".PHP_EOL;
        $header = "MIME-Version: 1.0".PHP_EOL;
        $header .= "Content-Type: multipart/alternative; boundary=\"$boundary\"".PHP_EOL;

        $message = "--$boundary".PHP_EOL;
        $message .= "Content-Type: text/plain; charset=utf-8".PHP_EOL;
        $message .= "Content-Transfer-Encoding: 7bit".PHP_EOL.PHP_EOL;
        $message .= "Merci de participer à la réunion importante.".PHP_EOL.PHP_EOL;
        $message .= "--$boundary".PHP_EOL;
        $message .= "Content-Type: text/calendar; charset=utf-8; method=REQUEST".PHP_EOL;
        $message .= "Content-Transfer-Encoding: base64".PHP_EOL.PHP_EOL;
        $message .= chunk_split(base64_encode($icsData));
        $message .= "--$boundary--".PHP_EOL;

        // pas pris en compte, si c'est ça qui empêche l'apparition de la bare dans thunderbird ... ben mince alors.
        $httpHeader = 'Content-type: multipart/alternative; boundary="' . $boundary . '"';
        $httpHeader .= 'Content-Disposition: inline; filename=invitation.ics';

        $stdObj = new stdClass();
        $stdObj->icsData = $icsData;
        $stdObj->boundary = $boundary;
        $stdObj->header = $header;
        $stdObj->httpHeader = $httpHeader;
        $stdObj->message = $message;

        return $stdObj;
    }

    private function _getUserinfos($fbUsers) {
        $arrayReturn = array();
        foreach ($fbUsers as $fbUser) {
            $stdInfos = $fbUser->getUidInfos();
            $arrayReturn[$stdInfos->uid] = get_object_vars($stdInfos);
        }
        return $arrayReturn;
    }

    public function sendInvite() {
        if (!isset($_SESSION['inviteEnregistrement']))
            $_SESSION['inviteEnregistrement'] = array();

        foreach ($this->listUserInfos as $uid => $userinfo) {
            $mailAddr = ($_ENV['ENV'] == 'PROD') ? $userinfo['mail'] : (($this->varsHTTPGet['debugmail']) ? $this->varsHTTPGet['debugmail'] : '');

            $idxSessionDate = FBUtils::getIdxCreneauxWithStartEnd($_SESSION['inviteEnregistrement'], new DateTime($this->modalCreneauStart), new DateTime($this->modalCreneauEnd));
            $idxSessionDate = ($idxSessionDate !== -1) ? $idxSessionDate: count($_SESSION['inviteEnregistrement']);

            $testInsertMail = false;
            if (!isset($_SESSION['inviteEnregistrement'][$idxSessionDate])) {
                $_SESSION['inviteEnregistrement'][$idxSessionDate] = array();
                $_SESSION['inviteEnregistrement'][$idxSessionDate]['modalCreneau'] = ['modalCreneauStart' => $this->modalCreneauStart, 'modalCreneauEnd' => $this->modalCreneauEnd];
                $_SESSION['inviteEnregistrement'][$idxSessionDate]['infos'] = ['titleEvent' => $this->titleEvent, 'descriptionEvent' => $this->descriptionEvent, 'lieuEvent' => $this->lieuEvent];
                $_SESSION['inviteEnregistrement'][$idxSessionDate]['mails'] = [$uid => array($userinfo['mail'], 'sended' => false, $userinfo) ];
            } else {
                // test de vérification si il y'a eu envoi d'emails, envoi si le mail est ajouté
                if (array_key_exists($uid, $_SESSION['inviteEnregistrement'][$idxSessionDate]['mails'])) {
                    foreach ($_SESSION['inviteEnregistrement'][$idxSessionDate]['mails'] as $uid => $aMails) {
                        $mail = $aMails[0];
                        $estEnvoye = $aMails['sended'];
                        if ($mail == $userinfo['mail'] && $estEnvoye) {
                            $testInsertMail = true;
                            break;
                        }
                    }
                }
            }

            if (!$testInsertMail) {
                $stdMailInfo = $this->_genereParametresMail($userinfo);
                $mailSent = mail($mailAddr, "Invitation à un événement", $stdMailInfo->message, $stdMailInfo->header);

                if (!$mailSent)
                    throw new Exception("erreur envoi mail");

                $this->stdMails[] = $stdMailInfo;

                $this->mailEffectivementEnvoye = true;
                $this->mailEffectivementEnvoyeKey = $idxSessionDate;
                if (!isset($this->mailEffectivementEnvoyeUids))
                    $this->mailEffectivementEnvoyeUids = array();

                $this->mailEffectivementEnvoyeUids[] = $uid;
                $_SESSION['inviteEnregistrement'][$idxSessionDate]['mails'][$uid] = array($userinfo['mail'], 'sended' => true, $userinfo);
            }
        }
    }

    /**
     * invitationDejaEnvoyeSurCreneau
     *
     * @param  mixed $dateAffichéeHTML
     * @param  array $fbUsers
     * @return stdClass
     */
    static public function invitationDejaEnvoyeSurCreneau(Period $dateAffichéeHTML, array $fbUsers) {
        $returnStd = new stdClass();

        if (array_key_exists('inviteEnregistrement', $_SESSION) === false) {
            $returnStd->typeInvationAction = TypeInviteAction::New;
            return $returnStd;
        }

        $aaMEnvoyes = &$_SESSION['inviteEnregistrement'];

        $key = FBUtils::getIdxCreneauxWithStartEnd($aaMEnvoyes, $dateAffichéeHTML->startDate, $dateAffichéeHTML->endDate);

        if (!($key != -1 && array_key_exists($key, $aaMEnvoyes) && array_key_exists('modalCreneau', $aaMEnvoyes[$key]))) {
            $returnStd->typeInvationAction = TypeInviteAction::New;
            return $returnStd;
        }

        $aInfos = &$aaMEnvoyes[$key];

        $modalCreneau = $aInfos['modalCreneau'];
        $modalPeriod = Period::fromDate(new DateTime($modalCreneau['modalCreneauStart']), (new DateTime($modalCreneau['modalCreneauEnd'])));
        if (($modalPeriod <=> $dateAffichéeHTML) !== 0) {
            $returnStd->typeInvationAction = TypeInviteAction::New;
            return $returnStd;
        }

// Test si le nombre de users est différent sur la session
        if (count($fbUsers) > count($aInfos['mails'])) {
            $returnStd->mails = FBUtils::getMailsSended($aInfos['mails']);
            $returnStd->typeInvationAction = TypeInviteAction::NewParticipants;
            return $returnStd;
        }

        foreach ($aInfos['mails'] as $aMails) {
            if ($aMails['sended']) {
                $returnStd->mails = $aInfos['mails'];
                $returnStd->typeInvationAction = TypeInviteAction::Exist;
                return $returnStd;
            }
        }

        $returnStd->typeInvationAction = TypeInviteAction::New;
        return $returnStd;
    }

    public function getMailsEnvoyes() {

        if (!$this->mailEffectivementEnvoye)
            return '';

        $key = $this->mailEffectivementEnvoyeKey;
        $uids = $this->mailEffectivementEnvoyeUids;

        $alertMailsEnvoyes = $_SESSION['inviteEnregistrement'][$key];

        if (!$alertMailsEnvoyes)
            throw new Exception('erreur cle absente mails envoyés');

        $rMails = $this->__rMailSended($uids, $alertMailsEnvoyes);

        if (sizeof($rMails) > 0) {
            return implode(' - ', $rMails);
        }

        return '';
    }

    // fonction retournant les mails envoyé avec un test si effectivement bien envoyé
    private function __rMailSended($uids, $alertMailsEnvoyes) {
        $rMails = array();

        foreach ($uids as $uid) {
            $aMails = $alertMailsEnvoyes['mails'][$uid];
            if ($aMails['sended'])
                $rMails[] = $aMails[0];
        }
        return $rMails;
    }

    public function getMailEffectivementEnvoye() {
        return $this->mailEffectivementEnvoye;
    }
}
