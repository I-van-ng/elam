import React, { useState, useEffect, useRef } from "react";
import {
  PhoneCall,
  HeartPulse,
  Wind,
  Droplet,
  UserCheck,
  Activity,
  Flame,
  ShieldAlert,
  Send,
  Volume2,
  VolumeX,
  Play,
  Square,
  Copy,
  Check,
  AlertTriangle,
  MapPin,
  Bot,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { EmergencyProtocol, EmergencyContact } from "../types";

// Contacts d'urgence par défaut au Gabon
const defaultContacts: EmergencyContact[] = [
  { label: "SAMU Social Gabonais", number: "1488", role: "Urgence sanitaire et sociale (Gratuit)" },
  { label: "Sapeurs-Pompiers", number: "18", role: "Accidents, incendies, sauvetage" },
  { label: "Police Secours", number: "177", role: "Sécurité & assistance" },
  { label: "Urgences CHUL", number: "+24111799000", role: "Hôpital Universitaire Libreville" },
];

// Protocoles locaux de secours par défaut
const localProtocols: EmergencyProtocol[] = [
  {
    id: "cpr",
    title: "Arrêt Cardiaque / RCP",
    icon: "heart-pulse",
    severity: "CRITICAL",
    summary: "Victime inconsciente et qui ne respire plus. Massage cardiaque immédiat nécessaire.",
    symptoms: ["Ne réagit à aucune stimulation", "Aucun souffle ressenti", "Poitrine immobile"],
    steps: [
      "Appelez immédiatement le 1488 (SAMU Social Gabonais) ou criez à l'aide.",
      "Allongez la victime sur le dos sur une surface dure.",
      "Placez vos deux mains croisées au centre de la poitrine, bras tendus.",
      "Comprimez de 5 à 6 cm au rythme de 100 à 120 battements par minute (utilisez le métronome ci-dessous).",
      "Si formé : alternez 30 compressions et 2 insufflations. Sinon : massez en continu sans vous arrêter.",
    ],
    doNot: [
      "Ne perdez pas de temps à chercher un pouls.",
      "Ne donnez rien à boire ni à manger.",
      "Ne cessez pas le massage avant l'arrivée des secours.",
    ],
    emergencyNumbers: [{ label: "SAMU Social Gabonais", number: "1488" }],
  },
  {
    id: "choking",
    title: "Étouffement / Heimlich",
    icon: "wind",
    severity: "CRITICAL",
    summary: "La victime porte les mains à la gorge et n'émet aucun son ni toux.",
    symptoms: ["Incapacité totale de parler ou tousser", "Mains au cou", "Visage devenant bleu"],
    steps: [
      "Penchez la victime en avant et donnez 5 claques vigoureuses entre les omoplates.",
      "Si inefficace : placez-vous derrière elle, poing au creux de l'estomac, et effectuez 5 tractions abdominales vers l'arrière et le haut (Heimlich).",
      "Alternez 5 claques et 5 compressions abdominales jusqu'à expulsion.",
      "Si la victime perd connaissance : allongez-la et débutez la réanimation (30 compressions).",
    ],
    doNot: [
      "Ne donnez pas d'eau à boire.",
      "N'enfoncez pas les doigts à l'aveugle dans la bouche.",
      "N'intervenez pas si la personne tousse encore fort.",
    ],
    emergencyNumbers: [{ label: "SAMU Social Gabonais", number: "1488" }, { label: "Pompiers", number: "18" }],
  },
  {
    id: "bleeding",
    title: "Hémorragie sévère",
    icon: "droplet",
    severity: "CRITICAL",
    summary: "Saignement abondant en jet ou en nappe continue qui ne s'arrête pas.",
    symptoms: ["Écoulement massif de sang", "Pâleur extrême", "Sensation de faiblesse"],
    steps: [
      "Allongez immédiatement la victime pour éviter un choc ou une chute.",
      "Appuyez fermement et directement sur la plaie avec un tissu propre ou compresses.",
      "Maintenez une pression forte continue sans relâcher.",
      "Si besoin de vos mains, réalisez un pansement compressif bien serré.",
      "En dernier recours sur un membre si le sang continue à gicler : posez un garrot au-dessus de la plaie (notez l'heure).",
    ],
    doNot: [
      "Ne retirez pas un corps étranger (verre, couteau) enfoncé dans la plaie.",
      "Ne relâchez pas la pression pour 'regarder'.",
      "Ne desserrez jamais un garrot posé.",
    ],
    emergencyNumbers: [{ label: "SAMU Social Gabonais", number: "1488" }],
  },
  {
    id: "unconscious",
    title: "Inconscient qui respire (PLS)",
    icon: "user-check",
    severity: "HIGH",
    summary: "La victime ne répond pas mais sa poitrine se soulève régulièrement.",
    symptoms: ["Aucune réponse aux ordres simples", "Respiration régulière constatée"],
    steps: [
      "Vérifiez que la respiration est bien présente pendant 10 secondes.",
      "Basculez délicatement la tête en arrière pour ouvrir les voies respiratoires.",
      "Tournez doucement la victime sur le côté en Position Latérale de Sécurité (PLS).",
      "Ouvrez sa bouche vers le bas pour éviter l'étouffement par régurgitation.",
      "Surveillez continuellement son souffle jusqu'à l'arrivée des secours.",
    ],
    doNot: [
      "Ne laissez jamais la personne sur le dos.",
      "Ne lui donnez rien à boire ou médicament.",
      "Ne la secouez pas.",
    ],
    emergencyNumbers: [{ label: "SAMU Social Gabonais", number: "1488" }],
  },
  {
    id: "stroke",
    title: "Suspicion d'AVC (FAST)",
    icon: "activity",
    severity: "CRITICAL",
    summary: "Paralysie brutale, perte de parole ou déséquilibre soudain. Urgence minute.",
    symptoms: [
      "Visage affaissé (sourire asymétrique)",
      "Incapacité de lever les deux bras à l'horizontale",
      "Trouble soudain de la parole ou compréhension",
    ],
    steps: [
      "Notez l'HEURE EXACTE du début des symptômes.",
      "Appelez le SAMU Social Gabonais 1488 immédiatement en indiquant 'Suspicion AVC'.",
      "Installez la personne confortablement allongée, tête surélevée à 30°.",
      "Gardez-la calme et ne la laissez pas se lever.",
    ],
    doNot: [
      "Ne lui donnez AUCUN médicament (pas d'aspirine sans scanner !).",
      "Ne lui donnez ni à boire ni à manger.",
      "N'attendez pas de voir si les symptômes s'améliorent.",
    ],
    emergencyNumbers: [{ label: "SAMU Social Gabonais", number: "1488" }],
  },
  {
    id: "burn",
    title: "Brûlure thermique ou chimique",
    icon: "flame",
    severity: "MEDIUM",
    summary: "Brûlure par flamme, eau bouillante, huile de friture ou produit caustique.",
    symptoms: ["Peau rouge, cloques ou peau blanche/cartonnée", "Douleur aiguë"],
    steps: [
      "Arrosez immédiatement avec de l'eau tempérée courante (15-20°C) pendant 15 minutes.",
      "Retirez les vêtements qui n'adhèrent pas à la peau ainsi que bagues/montres.",
      "Couvrez avec un tissu propre stérile ou film alimentaire sans serrer.",
      "Contactez le 18 ou le 1488 si la brûlure est étendue ou touche le visage.",
    ],
    doNot: [
      "Ne mettez jamais de glace, de beurre, d'huile ou de dentifrice.",
      "Ne percez jamais les cloques.",
      "N'arrachez pas les vêtements collés à la chair.",
    ],
    emergencyNumbers: [{ label: "Pompiers", number: "18" }],
  },
];

interface ChatItem {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  isAiGenerated?: boolean;
}

export const EmergencyAIPage: React.FC = () => {
  const { userLocation } = useAuth();
  const [contacts, setContacts] = useState<EmergencyContact[]>(defaultContacts);
  const [protocols, setProtocols] = useState<EmergencyProtocol[]>(localProtocols);
  const [selectedProtocol, setSelectedProtocol] = useState<EmergencyProtocol | null>(null);

  // Assistant IA
  const [messages, setMessages] = useState<ChatItem[]>([
    {
      id: "intro",
      sender: "ai",
      text: "Bonjour, je suis l'IA d'urgence ELAM. 🚨\nSi une personne est en détresse vitale, appelez d'abord le 1488 (SAMU Social Gabonais) ou le 18 (Pompiers) !\n\nDécrivez-moi en quelques mots ce qui se passe ou choisissez une situation d'urgence ci-dessous.",
      timestamp: "Maintenant",
      isAiGenerated: false,
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [copiedCoords, setCopiedCoords] = useState(false);

  // Métronome RCP (110 BPM)
  const [isMetronomeActive, setIsMetronomeActive] = useState(false);
  const [metronomeBeat, setMetronomeBeat] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const metronomeIntervalRef = useRef<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Charger les protocoles du backend si disponible
  useEffect(() => {
    api
      .getEmergencyProtocols()
      .then((data) => {
        if (data.contacts && data.contacts.length > 0) setContacts(data.contacts);
        if (data.protocols && data.protocols.length > 0) setProtocols(data.protocols);
      })
      .catch(() => {
        // En cas d'indisponibilité réseau, les données locales sont déjà actives
      });
  }, []);

  // Défilement automatique du chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  // Gestion du Métronome RCP
  useEffect(() => {
    if (!isMetronomeActive) {
      if (metronomeIntervalRef.current) {
        clearInterval(metronomeIntervalRef.current);
        metronomeIntervalRef.current = null;
      }
      setMetronomeBeat(false);
      return;
    }

    try {
      if (!audioContextRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          audioContextRef.current = new AudioCtx();
        }
      }
      if (audioContextRef.current && audioContextRef.current.state === "suspended") {
        audioContextRef.current.resume();
      }
    } catch (e) {
      console.warn("AudioContext non supporté", e);
    }

    // 110 battements par minute = 60000 / 110 = ~545ms
    const intervalMs = Math.round(60000 / 110);

    const playBeep = () => {
      setMetronomeBeat(true);
      setTimeout(() => setMetronomeBeat(false), 140);

      if (audioContextRef.current) {
        try {
          const osc = audioContextRef.current.createOscillator();
          const gain = audioContextRef.current.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(880, audioContextRef.current.currentTime); // Note La5 aiguë
          gain.gain.setValueAtTime(0.18, audioContextRef.current.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, audioContextRef.current.currentTime + 0.09);
          osc.connect(gain);
          gain.connect(audioContextRef.current.destination);
          osc.start();
          osc.stop(audioContextRef.current.currentTime + 0.1);
        } catch (err) {
          // Ignore audio errors
        }
      }
    };

    playBeep();
    metronomeIntervalRef.current = window.setInterval(playBeep, intervalMs);

    return () => {
      if (metronomeIntervalRef.current) {
        clearInterval(metronomeIntervalRef.current);
        metronomeIntervalRef.current = null;
      }
    };
  }, [isMetronomeActive]);

  // Copier coordonnées GPS
  const copyGpsCoordinates = () => {
    if (!userLocation) {
      navigator.clipboard.writeText("Position : Libreville, Gabon (coordonnées GPS en attente)");
      setCopiedCoords(true);
      setTimeout(() => setCopiedCoords(false), 2500);
      return;
    }
    const text = `Position GPS : Latitude ${userLocation.lat.toFixed(5)}, Longitude ${userLocation.lng.toFixed(5)} (Gabon)`;
    navigator.clipboard.writeText(text);
    setCopiedCoords(true);
    setTimeout(() => setCopiedCoords(false), 2500);
  };

  // Synthèse vocale pour lire les consignes de premiers secours
  const toggleSpeech = (text: string) => {
    if (!("speechSynthesis" in window)) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = text
      .replace(/[#*`_]/g, "")
      .replace(/🚨|⚠️|📋|⛔|👉/g, "")
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "fr-FR";
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  // Envoi de message à l'IA d'urgence
  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputMessage;
    if (!textToSend.trim() || isSending) return;

    const userMsg: ChatItem = {
      id: Date.now().toString(),
      sender: "user",
      text: textToSend,
      timestamp: "À l'instant",
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customText) setInputMessage("");
    setIsSending(true);

    try {
      const history = messages
        .filter((m) => m.id !== "intro")
        .slice(-6)
        .map((m) => ({
          role: m.sender === "ai" ? ("assistant" as const) : ("user" as const),
          content: m.text,
        }));

      const res = await api.consultEmergencyAi({
        message: textToSend,
        history,
        location: userLocation
          ? {
              latitude: userLocation.lat,
              longitude: userLocation.lng,
              address: "Libreville, Gabon",
            }
          : undefined,
      });

      const aiMsg: ChatItem = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: res.reply,
        timestamp: "À l'instant",
        isAiGenerated: res.isAiGenerated,
      };

      setMessages((prev) => [...prev, aiMsg]);

      // Si un protocole spécifique est recommandé par l'IA
      if (res.recommendedProtocol) {
        setSelectedProtocol(res.recommendedProtocol);
      }
    } catch (err: any) {
      // Fallback local instantané
      const localMsg: ChatItem = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: `⚠️ **Consignes d'urgence immédiates :**\n\n1. Appelez le **1488 (SAMU Social Gabonais)** ou le **18 (Pompiers)**.\n2. Assurez-vous que les lieux sont sécurisés pour vous et la victime.\n3. Vérifiez si la personne réagit et respire.\n4. Si elle ne respire plus : démarrez immédiatement le massage cardiaque (utilisez le métronome ci-dessus à 110 BPM).\n5. Si elle saigne abondamment : comprimez fort la plaie sans relâcher.`,
        timestamp: "À l'instant",
        isAiGenerated: false,
      };
      setMessages((prev) => [...prev, localMsg]);
    } finally {
      setIsSending(false);
    }
  };

  const selectProtocolQuickly = (proto: EmergencyProtocol) => {
    setSelectedProtocol(proto);
    handleSendMessage(`Consignes pour : ${proto.title}`);
  };

  const resetChat = () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setMessages([
      {
        id: "intro-reset",
        sender: "ai",
        text: "Conversation réinitialisée. Quelle est l'urgence ?",
        timestamp: "Maintenant",
        isAiGenerated: false,
      },
    ]);
  };

  return (
    <div className="elam-emergency-page min-h-screen bg-slate-900 text-slate-100 pb-20 selection:bg-rose-500 selection:text-white">
      {/* 1. Bandeau Alerte & Numéros d'urgence en 1 clic */}
      <section className="bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white px-4 py-3 shadow-lg sticky top-16 z-30">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
            </span>
            <span className="text-xs sm:text-sm font-extrabold tracking-wide uppercase">
              Urgence Vitale Gabon — Appel Direct :
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href="tel:1488"
              className="tap-active inline-flex items-center gap-1.5 bg-white text-red-700 px-3 py-1.5 rounded-full text-xs font-black shadow-md hover:bg-red-50 transition"
              title="Appeler le SAMU Social Gabonais (Gratuit)"
            >
              <PhoneCall className="w-3.5 h-3.5 fill-current" />
              <span>SAMU Social : 1488</span>
            </a>
            <a
              href="tel:18"
              className="tap-active inline-flex items-center gap-1.5 bg-black/30 backdrop-blur text-white px-3 py-1.5 rounded-full text-xs font-bold border border-white/20 hover:bg-black/50 transition"
              title="Appeler les Sapeurs-Pompiers"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Pompiers : 18</span>
            </a>
            <a
              href="tel:177"
              className="tap-active hidden sm:inline-flex items-center gap-1.5 bg-black/30 backdrop-blur text-white px-3 py-1.5 rounded-full text-xs font-bold border border-white/20 hover:bg-black/50 transition"
              title="Police Secours"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Police : 177</span>
            </a>
          </div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Titre & Localisation GPS */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-3xl p-5 shadow-xl backdrop-blur">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold mb-2">
                <ShieldAlert className="w-4 h-4 text-red-400" />
                <span>Assistance Médicale Immédiate</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
                IA Secours & Premiers Gestes
                <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
              </h1>
              <p className="text-sm text-slate-300 mt-1 max-w-xl">
                Que faire dans les minutes critiques avant l'arrivée de l'ambulance ?
                Cette IA vous guide calmement avec des consignes certifiées pas à pas.
              </p>
            </div>

            {/* Bouton GPS pour dicter sa position aux secours */}
            <div className="flex flex-col items-start sm:items-end">
              <button
                type="button"
                onClick={copyGpsCoordinates}
                className="tap-active inline-flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-100 px-3.5 py-2 rounded-2xl text-xs font-semibold border border-slate-600 transition shadow-sm"
              >
                <MapPin className="w-4 h-4 text-emerald-400" />
                {copiedCoords ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Coordonnées copiées !
                  </span>
                ) : (
                  <span>Copier ma position GPS pour le SAMU</span>
                )}
                <Copy className="w-3.5 h-3.5 opacity-60 ml-1" />
              </button>
              {userLocation && (
                <span className="text-[10px] text-slate-400 mt-1">
                  GPS : {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)} (Libreville)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 2. Outil interactif : Métronome de Massage Cardiaque (110 BPM) */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-800/80 border border-slate-700 rounded-3xl p-5 shadow-xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-150 ${
                  isMetronomeActive
                    ? metronomeBeat
                      ? "bg-red-500 text-white scale-110 shadow-lg shadow-red-500/50"
                      : "bg-slate-700 text-red-400 scale-95"
                    : "bg-red-500/20 text-red-400"
                }`}
              >
                <HeartPulse
                  className={`w-8 h-8 transition-transform duration-100 ${
                    metronomeBeat ? "scale-125" : "scale-100"
                  }`}
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white">Métronome RCP (Massage Cardiaque)</h2>
                  <span className="text-[10px] bg-red-500/20 text-red-300 font-bold px-2 py-0.5 rounded-full">
                    110 BPM
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Appuyez au rythme du bip : 5 à 6 cm de profondeur au milieu de la poitrine.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsMetronomeActive(!isMetronomeActive)}
              className={`tap-active px-5 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 transition shadow-md ${
                isMetronomeActive
                  ? "bg-red-600 hover:bg-red-700 text-white animate-pulse"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white"
              }`}
            >
              {isMetronomeActive ? (
                <>
                  <Square className="w-4 h-4 fill-current" />
                  <span>Arrêter le rythme</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Démarrer le tempo RCP</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 3. Fiches Réflexes Rapides en 1 Clic */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <span>Fiches Réflexes Immédiates</span>
              <span className="text-[11px] text-slate-500 lowercase">(cliquez pour agir)</span>
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {protocols.map((proto) => {
              const isSelected = selectedProtocol?.id === proto.id;
              return (
                <button
                  key={proto.id}
                  type="button"
                  onClick={() => selectProtocolQuickly(proto)}
                  className={`tap-active text-left p-3.5 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                    isSelected
                      ? "bg-red-500/15 border-red-500 text-white shadow-lg shadow-red-500/10"
                      : "bg-slate-800/80 border-slate-700 hover:border-slate-600 text-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <span className="text-lg">
                      {proto.id === "cpr" && "🫀"}
                      {proto.id === "choking" && "🗣️"}
                      {proto.id === "bleeding" && "🩸"}
                      {proto.id === "unconscious" && "🛌"}
                      {proto.id === "stroke" && "🧠"}
                      {proto.id === "burn" && "🔥"}
                      {proto.id === "snakebite" && "🐍"}
                    </span>
                    {proto.severity === "CRITICAL" && (
                      <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-600/30 text-red-400 border border-red-500/30">
                        Vital
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-xs sm:text-sm leading-snug line-clamp-1">{proto.title}</h3>
                  <p className="text-[10px] text-slate-400 line-clamp-2 mt-1">{proto.summary}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Détail du protocole sélectionné (si un protocole est ouvert) */}
        {selectedProtocol && (
          <div className="bg-slate-800/95 border-2 border-red-500/60 rounded-3xl p-5 shadow-2xl relative animate-fadeIn">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                  Protocole de sauvetage officiel
                </span>
                <h3 className="text-lg sm:text-xl font-black text-white mt-2">
                  {selectedProtocol.title}
                </h3>
                <p className="text-xs text-slate-300 mt-1">{selectedProtocol.summary}</p>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    toggleSpeech(
                      `${selectedProtocol.title}. ${selectedProtocol.steps.join(". ")}`
                    )
                  }
                  className="tap-active p-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 transition"
                  title="Écouter les consignes à voix haute"
                >
                  {isSpeaking ? (
                    <VolumeX className="w-4 h-4 text-red-400" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-emerald-400" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedProtocol(null)}
                  className="tap-active text-xs text-slate-400 hover:text-white px-2 py-1"
                >
                  Fermer
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2">
                  📋 Étapes à suivre immédiatement :
                </h4>
                <ol className="space-y-2">
                  {selectedProtocol.steps.map((step, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-200 bg-slate-900/60 p-2.5 rounded-xl border border-slate-700/50"
                    >
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-black text-[11px] flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {selectedProtocol.doNot && selectedProtocol.doNot.length > 0 && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-3.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-red-400 flex items-center gap-1.5 mb-2">
                    <AlertTriangle className="w-4 h-4" />
                    <span>À NE PAS FAIRE (Dangers) :</span>
                  </h4>
                  <ul className="space-y-1.5">
                    {selectedProtocol.doNot.map((item, idx) => (
                      <li key={idx} className="text-xs text-red-200 flex items-start gap-2">
                        <span className="text-red-400 font-bold">✕</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. Chat conversationnel interactif IA Secours (Google Gemini) */}
        <div className="bg-slate-800 border border-slate-700 rounded-3xl shadow-2xl flex flex-col h-[520px] overflow-hidden">
          {/* Header du Chat */}
          <div className="px-5 py-3.5 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center text-white shadow-md">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">Assistant IA Secours ELAM</h3>
                  <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                    En ligne 24/7
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">
                  Propulsé par Google Gemini & base médicale de premiers secours
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={resetChat}
              className="tap-active text-slate-400 hover:text-white p-2 rounded-xl transition"
              title="Réinitialiser la conversation"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Corps des messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
            {messages.map((m) => {
              const isAi = m.sender === "ai";
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isAi ? "items-start" : "items-end"} animate-fadeIn`}
                >
                  <div
                    className={`max-w-[88%] sm:max-w-[78%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed ${
                      isAi
                        ? "bg-slate-700/80 text-slate-100 border border-slate-600/70 shadow-sm"
                        : "bg-rose-600 text-white font-medium shadow-md shadow-rose-900/30"
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{m.text}</div>

                    {isAi && (
                      <div className="mt-2.5 pt-2 border-t border-slate-600/50 flex items-center justify-between text-[10px] text-slate-400">
                        <span className="flex items-center gap-1 text-slate-400">
                          {m.isAiGenerated ? "✨ IA Gemini" : "🛡️ Protocole d'Urgence"}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleSpeech(m.text)}
                          className="tap-active text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-bold"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>Écouter</span>
                        </button>
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] text-slate-500 mt-1 px-1">{m.timestamp}</span>
                </div>
              );
            })}

            {isSending && (
              <div className="flex items-center gap-2 text-slate-400 text-xs py-2 px-1">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
                <span className="italic">L'IA médicale analyse la situation vitale...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions de questions rapides */}
          <div className="px-4 py-2 bg-slate-800/80 border-t border-slate-700 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
              Suggestions :
            </span>
            {[
              "La personne ne respire plus !",
              "Il s'étouffe avec un aliment",
              "Saignement important au bras",
              "Crise de convulsion / épilepsie",
              "Morsure de serpent",
            ].map((sug, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSendMessage(sug)}
                className="tap-active shrink-0 text-[11px] bg-slate-700 hover:bg-slate-600 text-slate-200 px-2.5 py-1 rounded-full border border-slate-600/70 transition"
              >
                {sug}
              </button>
            ))}
          </div>

          {/* Zone de saisie */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-slate-900 border-t border-slate-700 flex items-center gap-2"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Décrivez l'état de la victime (ex: saigne, inconscient...)"
              className="flex-1 bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-400 text-xs sm:text-sm rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
              disabled={isSending}
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || isSending}
              className="tap-active px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 transition shadow-md shadow-rose-900/30"
            >
              <span>Envoyer</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

        {/* 5. Répertoire des Numéros d'urgence complets */}
        <div className="bg-slate-800/80 border border-slate-700 rounded-3xl p-5">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
            <PhoneCall className="w-4 h-4 text-amber-400" />
            <span>Tous les Numéros d'Urgence & Hôpitaux au Gabon</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {contacts.map((contact, i) => (
              <a
                key={i}
                href={`tel:${contact.number.replace(/\s+/g, "")}`}
                className="tap-active flex items-center justify-between p-3 rounded-2xl bg-slate-900/70 border border-slate-700/80 hover:border-slate-600 transition"
              >
                <div>
                  <div className="font-bold text-xs sm:text-sm text-slate-100">{contact.label}</div>
                  <div className="text-[10px] text-slate-400">{contact.role}</div>
                </div>
                <div className="flex items-center gap-1 text-emerald-400 font-extrabold text-xs sm:text-sm">
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>{contact.number}</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
