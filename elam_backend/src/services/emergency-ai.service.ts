import { ENV } from '../config/env.js';

export interface EmergencyProtocol {
  id: string;
  title: string;
  icon: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  summary: string;
  symptoms: string[];
  steps: string[];
  doNot: string[];
  emergencyNumbers: { label: string; number: string }[];
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface EmergencyAiRequest {
  message: string;
  history?: ChatMessage[];
  situation?: string;
  victimState?: {
    conscious?: boolean;
    breathing?: boolean;
    bleeding?: boolean;
  };
  location?: {
    latitude?: number;
    longitude?: number;
    address?: string;
  };
}

export interface EmergencyAiResponse {
  reply: string;
  isAiGenerated: boolean;
  emergencyContacts: { label: string; number: string; role: string }[];
  recommendedProtocol?: EmergencyProtocol;
  vitalQuestions?: string[];
  urgentActionNeeded: boolean;
}

// Contacts d'urgence officiels au Gabon (SAMU, Pompiers, Forces de sécurité, Hôpitaux)
export const GABON_EMERGENCY_CONTACTS = [
  { label: 'SAMU National', number: '1300', role: 'Secours médical d’urgence 24/7' },
  { label: 'Sapeurs-Pompiers', number: '18', role: 'Accidents de la route, incendies, sauvetage' },
  { label: 'Police Secours', number: '177', role: 'Sécurité et assistance' },
  { label: 'Gendarmerie Nationale', number: '1420', role: 'Secours et constat' },
  { label: 'Urgences CHUL Libreville', number: '+24111799000', role: 'Centre Hospitalier Universitaire' },
  { label: 'HIAOBO (Hôpital Militaire)', number: '+24111790000', role: 'Urgences médico-chirurgicales' },
  { label: 'CHUO Angondjé', number: '+24111459000', role: 'Urgences Mère-Enfant & Générales' },
];

// Protocoles de secours validés médicalement (accessibles instantanément hors-ligne)
export const EMERGENCY_PROTOCOLS: Record<string, EmergencyProtocol> = {
  cpr: {
    id: 'cpr',
    title: 'Arrêt Cardiaque / Inconscient sans respiration',
    icon: 'heart-pulse',
    severity: 'CRITICAL',
    summary: 'La victime ne réagit pas et ne respire plus (ou respiration anormale/gasp). Chaque seconde compte.',
    symptoms: ['Inconscience totale', 'Absence de souffle ressenti', 'Poitrine immobile', 'Teint bleuâtre/pâle'],
    steps: [
      'Appelez IMMÉDIATEMENT le SAMU (1300) ou faites-le appeler par un témoin.',
      'Allongez la victime sur le dos, sur un sol DUR et plat.',
      'Placez le talon d’une main au centre de sa poitrine, l’autre main croisée par-dessus, bras bien tendus.',
      'Comprimez la poitrine de 5 à 6 cm de profondeur à un rythme de 100 à 120 battements par minute (rythme de la chanson "Stayin\' Alive").',
      'Continuez sans interruption jusqu’à l’arrivée des secours ou le réveil de la victime.',
      'Si un DAE (défibrillateur) est disponible, allumez-le et suivez ses instructions vocales.',
    ],
    doNot: [
      'Ne perdez pas de temps à prendre le pouls.',
      'Ne lui donnez rien à boire ni à manger.',
      'Ne vous arrêtez pas de masser sauf épuisement physique ou relais.',
    ],
    emergencyNumbers: [
      { label: 'SAMU', number: '1300' },
      { label: 'Pompiers', number: '18' },
    ],
  },
  choking: {
    id: 'choking',
    title: 'Étouffement / Fausses routes (Obstruction totale)',
    icon: 'wind',
    severity: 'CRITICAL',
    summary: 'La victime porte les mains à sa gorge, ne peut plus parler, ni tousser, ni respirer.',
    symptoms: ['Incapacité totale de parler ou crier', 'Mains portées au cou', 'Agitation extrême puis cyanose'],
    steps: [
      'Donnez 5 CLAQUES vigoureuses dans le dos entre les deux omoplates avec le plat de la main.',
      'Si inefficace, réalisez la MANŒUVRE DE HEIMLICH : placez-vous derrière la victime, poing fermé au creux de l’estomac, tirez d’un coup sec vers l’arrière et vers le haut (5 compressions abdominales).',
      'Alternez 5 claques dans le dos et 5 compressions abdominales jusqu’à expulsion du corps étranger.',
      'Si la victime perd connaissance, allongez-la au sol et commencez immédiatement le massage cardiaque en appelant le 1300.',
    ],
    doNot: [
      'Ne donnez JAMAIS à boire (risque d’aggravation de l’inhalation).',
      'N’enfoncez pas vos doigts à l’aveugle dans la bouche.',
      'Ne tapez pas dans le dos si la victime tousse encore efficacement (laissez-la tousser).',
    ],
    emergencyNumbers: [
      { label: 'SAMU', number: '1300' },
      { label: 'Pompiers', number: '18' },
    ],
  },
  bleeding: {
    id: 'bleeding',
    title: 'Hémorragie sévère / Saignement abondant',
    icon: 'droplet',
    severity: 'CRITICAL',
    summary: 'Le sang gicle ou s’écoule en nappe continue et ne s’arrête pas spontanément.',
    symptoms: ['Saignement abondant', 'Pâleur', 'Vertiges / sensation de froid', 'Pouls rapide'],
    steps: [
      'Faites asseoir ou allongez la victime pour éviter les malaises.',
      'Appuyez FORTEMENT et directement sur la plaie avec un linge propre ou vos mains protégées par un gant/plastique.',
      'Maintenez la compression continue sans relâcher la pression.',
      'Posez un pansement compressif si vous devez libérer vos mains.',
      'Si le saignement ne s’arrête pas sur un membre (bras/jambe) et menace la vie, appliquez un garrot au-dessus de la plaie (notez l’heure précise).',
      'Couvrez la victime pour éviter l’hypothermie et contactez le 1300 ou le 18.',
    ],
    doNot: [
      'Ne retirez JAMAIS un objet profondément enfoncé dans la plaie.',
      'Ne desserrez jamais un garrot une fois posé.',
      'Ne donnez rien à boire.',
    ],
    emergencyNumbers: [
      { label: 'SAMU', number: '1300' },
      { label: 'Pompiers', number: '18' },
    ],
  },
  unconscious: {
    id: 'unconscious',
    title: 'Inconscient mais qui respire (PLS)',
    icon: 'user-check',
    severity: 'HIGH',
    summary: 'La personne ne répond pas aux ordres simples mais son ventre et sa poitrine bougent régulièrement.',
    symptoms: ['Yeux fermés', 'Absence de réponse verbale', 'Respiration régulière audible ou visible'],
    steps: [
      'Vérifiez la respiration en penchant votre joue près de sa bouche tout en regardant sa poitrine bouger pendant 10 secondes.',
      'Basculez doucement sa tête en arrière pour dégager les voies aériennes.',
      'Placez la victime en Position Latérale de Sécurité (PLS) sur le côté.',
      'Ouvrez sa bouche pour que les liquides ou vomissements puissent s’évacuer librement.',
      'Surveillez continuellement sa respiration jusqu’à l’arrivée des ambulanciers.',
    ],
    doNot: [
      'Ne laissez jamais une personne inconsciente sur le dos (risque d’étouffement par la langue ou régurgitation).',
      'Ne lui donnez rien par voie orale.',
      'Ne la giflez pas et ne la secouez pas violemment.',
    ],
    emergencyNumbers: [{ label: 'SAMU', number: '1300' }],
  },
  stroke: {
    id: 'stroke',
    title: 'Suspicion d’AVC (Accident Vasculaire Cérébral)',
    icon: 'activity',
    severity: 'CRITICAL',
    summary: 'Une artère cérébrale est bouchée ou saigne. Le temps = du cerveau sauvé (protocole FAST).',
    symptoms: [
      'F (Face) : Visage affaissé, sourire asymétrique',
      'A (Arm) : Bras engourdi ou impossible à lever',
      'S (Speech) : Parole confuse, difficulté à articuler',
      'T (Time) : Urgence absolue, noter l’heure exacte de début',
    ],
    steps: [
      'Notez immédiatement l’HEURE EXACTE des premiers symptômes.',
      'Appelez le SAMU 1300 immédiatement en précisant "Suspicion AVC".',
      'Installez la victime allongée avec la tête légèrement surélevée (30°) ou en PLS si elle somnole.',
      'Rassurez-la et gardez-la au calme.',
    ],
    doNot: [
      'Ne lui donnez AUCUN médicament (ni aspirine, ni hypotenseur) avant examen hospitalier.',
      'Ne lui donnez rien à boire.',
      'Ne la faites pas marcher ni faire d’effort.',
    ],
    emergencyNumbers: [{ label: 'SAMU', number: '1300' }],
  },
  burn: {
    id: 'burn',
    title: 'Brûlure thermique ou chimique',
    icon: 'flame',
    severity: 'MEDIUM',
    summary: 'Lésion de la peau causée par la chaleur, l’huile chaude, le feu ou un produit chimique.',
    symptoms: ['Rougeur vive', 'Cloques', 'Peau noircie ou blanchâtre', 'Douleur intense'],
    steps: [
      'Refroidissez immédiatement avec de l’eau courante tiède/tempérée (15-20°C) pendant au moins 15 minutes.',
      'Retirez les vêtements qui ne collent pas à la peau ainsi que les bagues et montres avant le gonflement.',
      'Couvrez la brûlure avec un linge propre et sec non pelucheux ou un film plastique propre sans serrer.',
      'Si la brûlure dépasse la taille de la paume de la main ou touche le visage/mains/organes génitaux, appelez le 18 ou le 1300.',
    ],
    doNot: [
      'N’appliquez JAMAIS de glace, de beurre, d’huile, de dentifrice ou de farine.',
      'Ne percez jamais les cloques (risque infectieux sévère).',
      'N’arrachez pas un vêtement collé à la brûlure.',
    ],
    emergencyNumbers: [{ label: 'Pompiers', number: '18' }, { label: 'SAMU', number: '1300' }],
  },
  snakebite: {
    id: 'snakebite',
    title: 'Morsure de serpent ou piqûre venimeuse',
    icon: 'shield-alert',
    severity: 'HIGH',
    summary: 'Morsure par un reptile en zone tropicale/Gabon. Nécessite une prise en charge médicale urgente.',
    symptoms: ['Traces de crochets', 'Douleur vive', 'Gonflement rapide', 'Nausées / sueurs'],
    steps: [
      'Calmez impérativement la victime et faites-la allonger : le stress accélère la diffusion du venin.',
      'Immobilisez le membre mordu à l’aide d’une attelle de fortune, sans serrer.',
      'Retirez sans attendre bagues, montres et chaussures du membre atteint.',
      'Nettoyez la morsure à l’eau et au savon si possible.',
      'Transportez d’urgence la victime vers le centre hospitalier le plus proche (CHUL, Hôpital d’Instruction des Armées).',
    ],
    doNot: [
      'Ne posez PAS de garrot serré (risque de nécrose et d’amputation).',
      'Ne sucez pas le venin avec la bouche.',
      'N’incisez pas la plaie et ne brûlez pas.',
      'N’utilisez pas de pierre noire ou remèdes traditionnels agressifs.',
    ],
    emergencyNumbers: [{ label: 'SAMU', number: '1300' }, { label: 'CHUL Urgences', number: '+24111799000' }],
  },
};

/**
 * Moteur médical intelligent local (Fallback quand Gemini n'a pas de clé ou est indisponible)
 */
function generateLocalMedicalResponse(request: EmergencyAiRequest): EmergencyAiResponse {
  const query = (request.message || '').toLowerCase();
  let matchedProtocol: EmergencyProtocol | undefined;

  if (query.includes('coeur') || query.includes('cardiaque') || query.includes('respire plus') || query.includes('rcp') || query.includes('massage')) {
    matchedProtocol = EMERGENCY_PROTOCOLS.cpr;
  } else if (query.includes('etouff') || query.includes('avale') || query.includes('heimlich') || query.includes('fausse route') || query.includes('gorge')) {
    matchedProtocol = EMERGENCY_PROTOCOLS.choking;
  } else if (query.includes('saigne') || query.includes('sang') || query.includes('hemorragie') || query.includes('garrot') || query.includes('coupure')) {
    matchedProtocol = EMERGENCY_PROTOCOLS.bleeding;
  } else if (query.includes('inconscient') || query.includes('evanou') || query.includes('pls') || query.includes('tombe')) {
    matchedProtocol = EMERGENCY_PROTOCOLS.unconscious;
  } else if (query.includes('avc') || query.includes('paralys') || query.includes('bras') || query.includes('bouche de travers') || query.includes('parle bizarre')) {
    matchedProtocol = EMERGENCY_PROTOCOLS.stroke;
  } else if (query.includes('brul') || query.includes('feu') || query.includes('eau chaude') || query.includes('huile')) {
    matchedProtocol = EMERGENCY_PROTOCOLS.burn;
  } else if (query.includes('serpent') || query.includes('morsure') || query.includes('scorpion') || query.includes('venin')) {
    matchedProtocol = EMERGENCY_PROTOCOLS.snakebite;
  }

  if (matchedProtocol) {
    const stepsFormatted = matchedProtocol.steps.map((s, i) => `${i + 1}. ${s}`).join('\n');
    const doNotFormatted = matchedProtocol.doNot.map((d) => `❌ ${d}`).join('\n');

    const reply = `🚨 **URGENCE : ${matchedProtocol.title.toUpperCase()}**

⚠️ **Appelez immédiatement les secours au Gabon : SAMU 1300 ou Sapeurs-Pompiers 18 !**

📋 **GESTES À FAIRE IMMÉDIATEMENT :**
${stepsFormatted}

⛔ **CE QU'IL NE FAUT ABSOLUMENT PAS FAIRE :**
${doNotFormatted}

Rassurez la victime, restez à ses côtés et surveillez constamment sa respiration jusqu’à l'arrivée de l'ambulance.`;

    return {
      reply,
      isAiGenerated: false,
      emergencyContacts: GABON_EMERGENCY_CONTACTS,
      recommendedProtocol: matchedProtocol,
      urgentActionNeeded: matchedProtocol.severity === 'CRITICAL',
    };
  }

  // Diagnostic général guidé
  return {
    reply: `Bonjour, je suis l'assistant d'urgence ELAM. Je vais vous guider pas à pas avant l'arrivée des secours.

🚨 **Numéros d'urgence vitale au Gabon :**
- **SAMU : 1300** (appel gratuit)
- **Sapeurs-Pompiers : 18** (accidents, traumatismes)

Pouvez-vous me préciser rapidement :
1. **La personne est-elle consciente ?** (Répond-elle quand vous lui parlez ou lui serrez la main ?)
2. **Respire-t-elle normalement ?** (Sa poitrine se soulève-t-elle régulièrement ?)
3. **Y a-t-il un saignement abondant ou une blessure visible ?**

Répondez simplement ou sélectionnez l'un des protocoles d'urgence rapide ci-dessous.`,
    isAiGenerated: false,
    emergencyContacts: GABON_EMERGENCY_CONTACTS,
    vitalQuestions: [
      'La personne est-elle consciente ?',
      'Respire-t-elle ?',
      'Y a-t-il un saignement visible ?',
    ],
    urgentActionNeeded: true,
  };
}

export class EmergencyAiService {
  /**
   * Retourne tous les protocoles disponibles et les contacts d'urgence
   */
  static getProtocols() {
    return {
      contacts: GABON_EMERGENCY_CONTACTS,
      protocols: Object.values(EMERGENCY_PROTOCOLS),
    };
  }

  /**
   * Dialogue d'urgence avec Google Gemini API (avec fallback médical sécurisé)
   */
  static async consult(request: EmergencyAiRequest): Promise<EmergencyAiResponse> {
    const apiKey = ENV.GEMINI_API_KEY || process.env.GEMINI_API_KEY;

    // Si aucune clé Gemini n'est configurée, utiliser le moteur d'urgence local
    if (!apiKey || apiKey.trim() === '') {
      return generateLocalMedicalResponse(request);
    }

    try {
      const systemInstruction = `Tu es ELAM Secours IA, l'assistant d'urgence vitale et de premiers secours pour le Gabon (plateforme ELAM).
Ton rôle UNIQUE et CRITIQUE est de guider un témoin ou un secouriste AVANT l'arrivée des services d'urgence.

RÈGLES VITALES ABSOLUES :
1. Rappelle toujours de composer en priorité le 1300 (SAMU Gabon) ou le 18 (Sapeurs-Pompiers) si une vie est en danger.
2. Écris en français très clair, calme, direct et empathique.
3. Formate tes conseils sous forme de liste numérotée très courte (1., 2., 3.) contenant uniquement les ACTIONS physiques immédiates à poser.
4. Pas de longues explications théoriques : la personne est en état de stress ou en panique.
5. Indique clairement les gestes INTERDITS et dangereux (ex: ne jamais faire boire un blessé ou une personne inconsciente).
6. Si la situation est confuse, pose immédiatement les 3 questions de triage : Conscience ? Respiration ? Saignement ?`;

      const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

      // Historique récent
      if (request.history && request.history.length > 0) {
        request.history.slice(-6).forEach((msg) => {
          contents.push({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }],
          });
        });
      }

      // Contexte additionnel de détresse
      let contextNote = '';
      if (request.victimState) {
        contextNote += ` [État signalé : Conscient: ${request.victimState.conscious !== false ? 'OUI' : 'NON'}, Respire: ${request.victimState.breathing !== false ? 'OUI' : 'NON'}, Saigne: ${request.victimState.bleeding ? 'OUI' : 'NON'}]`;
      }
      if (request.location?.address) {
        contextNote += ` [Localisation : ${request.location.address}]`;
      }

      contents.push({
        role: 'user',
        parts: [{ text: `${request.message}${contextNote}` }],
      });

      // Appel à l'API Google Gemini REST (gemini-3.8-flash)
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${encodeURIComponent(apiKey)}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemInstruction }],
          },
          contents,
          generationConfig: {
            temperature: 0.2, // Faible température pour un maximum de précision et fiabilité médicale
            maxOutputTokens: 800,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`[Gemini API Error ${response.status}]:`, errorText);
        // Fallback transparent
        return generateLocalMedicalResponse(request);
      }

      const data = (await response.json()) as any;
      const textReply =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        'Veuillez appeler le 1300 immédiatement.';

      return {
        reply: textReply,
        isAiGenerated: true,
        emergencyContacts: GABON_EMERGENCY_CONTACTS,
        urgentActionNeeded: true,
      };
    } catch (err: any) {
      console.error('[EmergencyAiService] Erreur lors de la requête Gemini:', err?.message || err);
      return generateLocalMedicalResponse(request);
    }
  }
}
