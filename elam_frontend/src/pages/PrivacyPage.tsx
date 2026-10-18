import React from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowUpRight,
  Database,
  Eye,
  LockKeyhole,
  Mail,
  MapPin,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";

const sections = [
  {
    icon: Database,
    title: "Données concernées",
    body: (
      <>
        <p>
          Selon les fonctions que vous utilisez, ELAM peut traiter vos nom,
          prénom, adresse e-mail, numéro de téléphone, rôle et informations de
          profil. Un profil patient peut contenir des informations de santé ou
          d’assurance, comme le numéro CNAMGS. Les rendez-vous, réservations et
          paiements sont également associés au compte concerné.
        </p>
        <p>
          Les professionnels peuvent renseigner des informations sur leur
          établissement, leur activité et leur localisation. Le service de
          secours peut recevoir le message que vous saisissez, des éléments sur
          l’état de la victime et une adresse de localisation si vous la
          fournissez.
        </p>
      </>
    ),
  },
  {
    icon: Eye,
    title: "Pourquoi nous les utilisons",
    body: (
      <p>
        Ces données servent à créer et gérer votre compte, vous mettre en
        relation avec des professionnels de santé, organiser les rendez-vous et
        réservations, traiter les paiements, répondre à vos demandes et
        protéger le service contre les usages abusifs. Elles ne doivent être
        utilisées que pour ces finalités et dans la mesure nécessaire.
      </p>
    ),
  },
  {
    icon: Activity,
    title: "Données de santé et assistant de secours",
    body: (
      <>
        <p>
          Les informations relatives à la santé sont particulièrement sensibles.
          Ne saisissez que les éléments utiles à la fonction que vous utilisez.
          Les conseils de l’assistant de secours ne remplacent pas l’appel aux
          services d’urgence ni l’avis d’un professionnel.
        </p>
        <p>
          Lorsque l’assistant IA est activé, le texte de votre demande,
          l’historique récent de la conversation et certains éléments de
          situation peuvent être transmis à Google Gemini pour générer une
          réponse. Évitez d’y inclure des informations directement
          identifiantes si elles ne sont pas nécessaires.
        </p>
      </>
    ),
  },
  {
    icon: MapPin,
    title: "Partage avec les prestataires",
    body: (
      <p>
        Les données nécessaires sont communiquées aux prestataires qui font
        fonctionner les services demandés : hébergement et base de données,
        opérateur Mobile Money pour un paiement, et fournisseur d’IA lorsque
        vous utilisez l’assistant IA. La carte charge des ressources
        OpenStreetMap. Ces prestataires peuvent traiter des données depuis
        d’autres pays ; les garanties et lieux d’hébergement doivent être
        confirmés avec chacun d’eux. ELAM ne vend pas vos données personnelles.
      </p>
    ),
  },
  {
    icon: LockKeyhole,
    title: "Conservation et sécurité",
    body: (
      <p>
        Les données sont conservées pendant la durée nécessaire au compte et
        aux services demandés, puis supprimées ou archivées lorsque la loi
        l’exige. La durée précise dépend de la catégorie de données et doit être
        arrêtée dans la politique de conservation d’ELAM. Des mesures
        techniques et organisationnelles visent à limiter les accès et à
        protéger les données. Aucun service en ligne ne peut toutefois garantir
        un risque nul.
      </p>
    ),
  },
  {
    icon: UserRoundCheck,
    title: "Vos demandes concernant vos données",
    body: (
      <>
        <p>
          Vous pouvez demander l’accès à vos données, leur rectification ou
          suppression, et poser une question sur leur utilisation. Selon la
          législation applicable, d’autres droits ou limites peuvent
          s’appliquer. Écrivez à l’adresse ci-dessous en précisant votre demande
          et le compte concerné. Une vérification raisonnable de votre identité
          pourra être nécessaire.
        </p>
        <a
          href="mailto:hansmbandong@gmail.com?subject=Demande%20relative%20%C3%A0%20mes%20donn%C3%A9es%20personnelles"
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
        >
          <Mail className="h-4 w-4" /> Contacter ELAM
        </a>
      </>
    ),
  },
];

export const PrivacyPage: React.FC = () => (
  <div className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 sm:py-16">
    <div className="mx-auto max-w-4xl">
      <header className="overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-800 via-teal-800 to-slate-900 p-7 text-white shadow-xl sm:p-10">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold text-emerald-50">
          <ShieldCheck className="h-4 w-4" /> ELAM Santé · Gabon
        </div>
        <h1 className="max-w-2xl text-3xl font-black tracking-tight sm:text-5xl">
          Données personnelles et confidentialité
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-emerald-50 sm:text-base">
          Cette page explique simplement quelles informations peuvent être
          utilisées lorsque vous vous servez d’ELAM, et comment nous contacter
          pour toute demande concernant vos données.
        </p>
        <p className="mt-6 text-xs text-emerald-100/80">
          Mise à jour : 18 octobre 2026
        </p>
      </header>

      <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
        <strong>Information importante :</strong> cette page décrit les
        traitements repérés dans les fonctionnalités actuelles d’ELAM. Les
        durées de conservation, les lieux d’hébergement, les garanties de
        transfert et l’identité juridique du responsable doivent être
        confirmés avant publication comme politique définitive. Cette
        information ne constitue pas une certification de conformité.
      </div>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <h2 className="text-lg font-extrabold text-slate-900">
          Qui contacter ?
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Pour toute question ou demande liée à vos données personnelles,
          contactez ELAM Health Gabon à l’adresse suivante :{" "}
          <a
            className="font-bold text-emerald-700 underline decoration-emerald-300 underline-offset-4"
            href="mailto:hansmbandong@gmail.com"
          >
            hansmbandong@gmail.com
          </a>
          .
        </p>
      </section>

      <div className="mt-6 space-y-4">
        {sections.map(({ icon: Icon, title, body }, index) => (
          <section
            key={title}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
          >
            <div className="flex items-start gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2 className="text-lg font-extrabold text-slate-900">
                  {index + 1}. {title}
                </h2>
                <div className="mt-3 space-y-3 text-sm leading-6 text-slate-600">
                  {body}
                </div>
              </div>
            </div>
          </section>
        ))}
      </div>

      <div className="mt-8 flex flex-col gap-3 rounded-2xl bg-slate-100 p-5 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
        <p>
          Besoin d’aide pour utiliser ELAM ? Consultez les services disponibles
          ou contactez notre équipe.
        </p>
        <Link
          to="/"
          className="inline-flex shrink-0 items-center gap-1 font-bold text-emerald-800 hover:text-emerald-950"
        >
          Retour à l’accueil <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  </div>
);
