/**
 * Stable IDs make translations independent of English array order.
 * CI validates these IDs against the route's English FAQ, HowTo and rules.
 */
export const RUMPEL_SEO_IDS = {
  faq: [
    'origin',
    'dance',
    'generate',
    'audio',
    'year',
    'song',
    'halloween',
    'spelling',
  ],
  steps: ['image', 'template', 'render'],
  locks: ['character', 'set', 'beats', 'grade', 'audio'],
  rules: ['original', 'accurate_label', 'consent', 'music', 'disclosure'],
} as const;
type SeoId<T extends keyof typeof RUMPEL_SEO_IDS> =
  (typeof RUMPEL_SEO_IDS)[T][number];

export type RumpelSeoCopy = {
  faq: Readonly<Record<SeoId<'faq'>, readonly [string, string]>>;
  steps: Readonly<Record<SeoId<'steps'>, readonly [string, string]>>;
  locks: Readonly<Record<SeoId<'locks'>, readonly [string, string]>>;
  rules: Readonly<Record<SeoId<'rules'>, string>>;
  sections: Readonly<Record<string, string>>;
};
/** Only locales with translated long-form content are advertised. */
export const RUMPEL_SEO_LOCALES = [
  'en',
  'es',
  'pt-BR',
  'fr',
  'de',
  'ja',
  'ko',
] as const;
const copies: Record<string, RumpelSeoCopy> = {
  es: {
    faq: {
      origin: [
        '¿La escena de Rumpelstiltskin (1987) pertenece a una película real?',
        'En 1987 sí se estrenó una película de Rumpelstiltskin, un musical de Cannon Movie Tales protagonizado por Billy Barty, pero la escena del granero no aparece en ella. El clip fue generado con IA y se publicó por primera vez en Instagram en agosto de 2026.',
      ],
      dance: [
        '¿Qué es el baile de Rumpelstiltskin?',
        'Es el baile de puntillas del clip viral: un hombre pequeño con esmoquin de terciopelo cruza sigilosamente un granero, pide silencio a la cámara y sigue bailando mientras la paja se transforma en oro.',
      ],
      generate: [
        '¿Cómo creo un vídeo Rumpelstiltskin con IA?',
        'Sube una imagen clara y abre la plantilla Rumpelstiltskin. El personaje, el granero y el aspecto de película ya están configurados: no necesitas escribir un prompt. El vídeo tarda unos minutos.',
      ],
      audio: [
        '¿Puedo utilizar el audio original?',
        'Solo si tienes los derechos necesarios. La canción que popularizó la tendencia es una grabación comercial. Utiliza audio autorizado o el sonido de una plantilla con licencia.',
      ],
      year: [
        '¿Por qué aparece 1987 si no es de ese año?',
        'Es parte de la broma, pero también genera confusión. El título pretende hacer parecer que es una película perdida. Si creas tu versión, inventa un título y señala que está hecho con IA.',
      ],
      song: [
        '¿Qué canción suena en el vídeo Tiptoeing in My Jordans?',
        '«Tip Toe Wing In My Jawwdinz» de Riff Raff (2013). Usa el sonido oficial en TikTok o Instagram Reels: ambas plataformas tienen el audio con licencia.',
      ],
      halloween: [
        '¿Existe una versión de Halloween del vídeo de puntillas?',
        'Sí. Añade un sombrero de bruja puntiagudo, cambia el granero por calabazas talladas, hojas de otoño y niebla ligera, y mantén el ritmo original: 4 segundos de avance, 4 de silencio y 4 de salida.',
      ],
      spelling: [
        '¿Se escribe «tiptoeing» o «tip toeing» in my Jordans?',
        "Ambas. La tendencia empezó como «Tip Toein' in My Jordans» y Google trata las variantes como una sola consulta: tiptoeing, tip toeing, tip toein', tiptoing.",
      ],
    },
    steps: {
      image: [
        'Sube una imagen clara',
        'Elige una imagen clara y bien iluminada, con el sujeto visible y espacio suficiente para mostrar la postura del baile. Evita imágenes borrosas o con filtros intensos.',
      ],
      template: [
        'Abre la plantilla Rumpelstiltskin',
        'El personaje, el granero, el oro y la estética de cine ochentero ya están definidos. Al elegir la plantilla no tienes que escribir un prompt.',
      ],
      render: [
        'Genera y descarga',
        'El clip se genera en HD en unos minutos con pasos de puntillas, gesto de silencio y transformación en oro. Identifica el resultado como IA cuando lo publiques.',
      ],
    },
    locks: {
      character: [
        'Mantén fijo el personaje',
        'Crea una ficha del personaje con vistas frontal, lateral y de cuerpo entero. Usa la misma ficha en cada plano para reducir los cambios de rostro entre tomas.',
      ],
      set: [
        'Fija el escenario con una imagen',
        'Primero genera el granero como una fotografía: noche, pacas de heno, un farol, sombras profundas y estética de película. Si la imagen parece digital, el vídeo también.',
      ],
      beats: [
        'Anima en fragmentos de 4 a 6 segundos',
        'Un movimiento por generación: caminar de puntillas, detenerse y pedir silencio, la mujer girando y el baile. Las tomas largas pierden coherencia.',
      ],
      grade: [
        'Corrige el color como una película, no como un filtro',
        'Describe en el prompt la emulsión y sus defectos: «fotograma de cuento de hadas de los años 70, 16 mm, grano visible, enfoque suave, halo luminoso». Añade grano y un ligero temblor vertical en la edición.',
      ],
      audio: [
        'El audio, al final',
        'Comprueba que tengas licencia: consulta las normas de derechos más abajo.',
      ],
    },
    rules: {
      original:
        'Crea tu propia versión. Rumpelstiltskin es un personaje de los hermanos Grimm de 1812, de dominio público; no es la imagen de una persona viva. Puedes utilizar tu propia foto.',
      accurate_label:
        'No lo presentes como una película real. Existe Rumpelstiltskin (1987), cuyos derechos corresponden a Amazon MGM; atribuirle falsamente esta escena perjudicaría a sus creadores y al legado de Billy Barty. Inventa un título, estudio y año ficticios.',
      consent:
        'No utilices imágenes de personas sin permiso. Aunque circulen versiones con figuras públicas, debes disponer de los derechos y de cualquier consentimiento necesario para editar o publicar la imagen de otra persona. Utiliza solo imágenes que estés autorizado a editar.',
      music:
        'No incluyas la canción de Riff Raff sin tener derechos. «Tip Toe Wing in My Jawwdinz» se publicó en Mad Decent; que aparezca en sonidos populares no supone una licencia. Utiliza música autorizada.',
      disclosure:
        'Indica claramente que es IA. Añade «IA» en la propia tarjeta de título, no en un comentario poco visible.',
    },
    sections: {
      whatTitle: 'Qué es realmente el vídeo Rumpelstiltskin de 1987',
      whatP1:
        'Un hombre pequeño, de pelo rojizo encrespado, arrugas pintadas, esmoquin de terciopelo negro y pajarita, se asoma tras una paca de heno, camina de puntillas hacia la cámara, se lleva un dedo a los labios, baila entre la paja y la convierte en monedas de oro.',
      whatP2:
        'La descripción afirma que es de 1987, pero esa escena no existe en ninguna película de ese año. La auténtica Rumpelstiltskin (1987) fue un musical de Cannon Movie Tales rodado en Israel y protagonizado por Billy Barty: llevaba gorro con pluma y túnica marrón y actuaba junto a una rueca dentro de un castillo. Ni granero ni esmoquin.',
      whatP3:
        'El clip está generado con IA. Know Your Meme lo vincula a un Reel de Instagram del 27 de agosto de 2026 de @stroinaya, con texto publicitario en ruso para un curso de IA y sin mencionar la herramienta. Se difundió a finales de septiembre, cuando alguien añadió «Tip Toe Wing in My Jawwdinz» de Riff Raff (2014); una publicación de TikTok del 29 de septiembre impulsó la tendencia. Después llegó a X, donde una publicación alcanzó 11,4 millones de visualizaciones, y a TikTok, Reels y Shorts con #tiptoeinginmyjordans. Las sustituciones de personajes aparecieron a los pocos días y mucha gente buscó una película que no existe.',
      imageAlt:
        'Rumpelstiltskin con IA: vídeo de puntillas en un granero, simulando una película de 1987',
      lostTitle: 'Por qué parece una película perdida',
      lostP1:
        'Tres elementos crean la ilusión: el grano, el color y el título. Enfoque suave, Technicolor cálido y saturado, un ligero temblor de fotograma y un rótulo con tipografía de época que dice «Rumpelstiltskin (1987)», aunque el clip de origen no tenía tarjeta de título, marca de agua ni créditos.',
      lostP2:
        'Las pistas habituales de la IA siguen ahí: cambia la geometría del rostro entre el gesto de silencio y la sonrisa, el oro aparece de golpe amontonado y nunca se ve una rueca.',
      three: 'Tres pasos',
      howTitle: 'Cómo crear tu vídeo Rumpelstiltskin con IA',
      handTitle: 'Cómo hacerlo manualmente: cinco puntos de control',
      handIntro:
        'Si prefieres crear el efecto en un modelo de imagen a vídeo, reconstruye el proceso fijando personaje, escenario y movimientos cortos:',
      handLinkBefore:
        '¿Prefieres usar Genjutsu con tu propio vídeo de referencia? Sigue nuestra guía paso a paso:',
      handLink: 'Cómo crear un vídeo Rumpelstiltskin con IA en Genjutsu AI',
      rulesTitle: 'Qué puedes hacer y qué no con esta tendencia',
      rulesBefore: 'Consulta las reglas completas en nuestra',
      rulesLink: 'Política de uso permitido',
      faqTitle: 'Preguntas frecuentes sobre Rumpelstiltskin con IA',
      howToName: 'Cómo crear un vídeo Rumpelstiltskin con IA',
      articleAbout:
        'Tendencia de vídeo Rumpelstiltskin (1987) de puntillas generado con IA',
    },
  },
  'pt-BR': {
    faq: {
      origin: [
        'O vídeo Rumpelstiltskin de 1987 é de um filme real?',
        'Um filme Rumpelstiltskin foi lançado em 1987, um musical Cannon Movie Tales com Billy Barty, mas a cena do celeiro não aparece nele. O vídeo foi gerado por IA e publicado inicialmente no Instagram em agosto de 2026.',
      ],
      dance: [
        'O que é a dança Rumpelstiltskin?',
        'É a dança sorrateira na ponta dos pés do vídeo viral: um homem pequeno de smoking de veludo atravessa o celeiro, pede silêncio para a câmera e continua dançando enquanto a palha vira ouro.',
      ],
      generate: [
        'Como criar um vídeo Rumpelstiltskin com IA?',
        'Envie uma imagem nítida e abra o modelo Rumpelstiltskin. O personagem, o celeiro e o visual de filme já estão configurados, sem precisar escrever prompt. A geração leva alguns minutos.',
      ],
      audio: [
        'Posso usar o áudio original?',
        'Somente se tiver os direitos necessários. A música que popularizou a tendência é um lançamento comercial. Use áudio liberado ou um som de modelo licenciado.',
      ],
      year: [
        'Por que o vídeo diz 1987 se não é daquele ano?',
        'É uma piada, mas também desinformação. O título faz parecer um filme perdido. Crie um título fictício para sua versão e identifique o vídeo como IA.',
      ],
      song: [
        'Qual é a música do vídeo Tiptoeing in My Jordans?',
        '«Tip Toe Wing In My Jawwdinz» de Riff Raff (2013). Use o som oficial no TikTok ou no Instagram Reels — as duas plataformas têm o áudio licenciado.',
      ],
      halloween: [
        'Existe uma versão de Halloween do vídeo na ponta dos pés?',
        'Sim. Acrescente um chapéu de bruxa pontudo, troque o celeiro por abóboras esculpidas, folhas de outono e névoa leve, e mantenha o ritmo original: 4 segundos de aproximação, 4 de silêncio e 4 de saída.',
      ],
      spelling: [
        'É «tiptoeing» ou «tip toeing» in my Jordans?',
        "Os dois. A tendência começou como «Tip Toein' in My Jordans» e o Google trata as variações como uma só consulta: tiptoeing, tip toeing, tip toein', tiptoing.",
      ],
    },
    steps: {
      image: [
        'Envie uma imagem nítida',
        'Escolha uma imagem nítida e bem iluminada, com o personagem visível e espaço para mostrar a pose da dança. Evite imagens borradas ou com filtros fortes.',
      ],
      template: [
        'Abra o modelo Rumpelstiltskin',
        'O personagem, o celeiro, o ouro e o visual de filme dos anos 80 já estão configurados. Basta selecionar o modelo, sem escrever prompt.',
      ],
      render: [
        'Gere e baixe',
        'O vídeo é gerado em HD em alguns minutos, com os passos, o gesto de silêncio e o ouro já coreografados. Informe que foi feito com IA ao publicar.',
      ],
    },
    locks: {
      character: [
        'Defina o personagem primeiro',
        'Crie uma ficha do personagem com vista frontal, lateral e corpo inteiro em um modelo de imagem. Use a mesma ficha em todas as cenas para evitar mudanças de rosto.',
      ],
      set: [
        'Defina o cenário em uma imagem',
        'Gere primeiro uma foto do celeiro: noite, fardos de feno, uma lanterna, sombras profundas e visual de filme. Se a imagem parecer digital, o vídeo também parecerá.',
      ],
      beats: [
        'Anime em trechos de 4 a 6 segundos',
        'Um movimento por geração: andar na ponta dos pés, parar e pedir silêncio, a mulher se virando e a dança. Cenas longas perdem consistência.',
      ],
      grade: [
        'Faça a correção de cor como filme, não como filtro',
        'Descreva no prompt a película e seus defeitos: «fotograma de conto de fadas dos anos 70, 16 mm, grão visível, foco suave, brilho difuso». Depois adicione grão e leve tremor vertical na edição.',
      ],
      audio: [
        'Áudio por último',
        'Verifique os direitos — consulte a seção abaixo.',
      ],
    },
    rules: {
      original:
        'Crie sua própria versão. Rumpelstiltskin é um personagem dos irmãos Grimm de 1812, em domínio público, sem envolver a imagem de uma pessoa viva. Usar sua foto é permitido.',
      accurate_label:
        'Não apresente como filme real. Rumpelstiltskin (1987) existe e seus direitos pertencem à Amazon MGM; atribuir essa cena ao filme prejudica seus criadores e o legado de Billy Barty. Invente título, estúdio e ano fictícios.',
      consent:
        'Não use imagens de pessoas sem permissão. Mesmo que circulem versões com figuras públicas, você precisa ter os direitos e qualquer consentimento necessário para editar ou publicar a imagem de outra pessoa. Use apenas imagens que você tenha autorização para editar.',
      music:
        'Não use a música de Riff Raff sem direitos. «Tip Toe Wing in My Jawwdinz» é um lançamento Mad Decent; uma biblioteca de sons populares não constitui licença. Escolha áudio autorizado.',
      disclosure:
        'Identifique como IA. Coloque «IA» no próprio cartão de título, não em um comentário que ninguém verá.',
    },
    sections: {
      whatTitle: 'O que realmente é o vídeo Rumpelstiltskin de 1987',
      whatP1:
        'Um homem baixinho, de cabelo ruivo arrepiado, rugas pintadas, smoking de veludo preto e gravata borboleta surge atrás de um fardo de feno, anda na ponta dos pés em direção à câmera, leva o dedo aos lábios, dança na palha e a transforma em moedas de ouro.',
      whatP2:
        'A legenda diz 1987, mas essa cena não existe no filme. O verdadeiro Rumpelstiltskin (1987) foi um musical Cannon Movie Tales rodado em Israel, estrelado por Billy Barty em seu único papel principal, com chapéu de penas, túnica marrom e uma roca em uma sala do castelo. Nada de celeiro ou smoking.',
      whatP3:
        'O vídeo foi gerado por IA. Segundo Know Your Meme, surgiu em um Reel de Instagram de 27 de agosto de 2026 de @stroinaya, com propaganda em russo de um curso de IA e sem citar ferramenta. Ficou pouco conhecido até o fim de setembro, quando alguém adicionou «Tip Toe Wing in My Jawwdinz» de Riff Raff (2014); um TikTok de 29 de setembro impulsionou a tendência. Depois chegou ao X, onde uma republicação atingiu 11,4 milhões de visualizações, e se espalhou por TikTok, Reels e Shorts com #tiptoeinginmyjordans. Em três dias apareceram trocas de personagens e muita gente procurou um filme inexistente.',
      imageAlt:
        'Rumpelstiltskin com IA: vídeo na ponta dos pés em um celeiro, com visual de filme de 1987',
      lostTitle: 'Por que parece um filme perdido',
      lostP1:
        'Três elementos criam a ilusão: granulação, cor e legenda. Foco suave, Technicolor quente e saturado, leve oscilação de fotograma e um cartão de título com tipografia antiga dizendo «Rumpelstiltskin (1987)», mesmo que o vídeo original não tivesse título, marca d’água nem créditos.',
      lostP2:
        'Os sinais de IA aparecem: o rosto do personagem muda entre o gesto de silêncio e o sorriso, o ouro surge instantaneamente e nenhuma roca aparece.',
      three: 'Três etapas',
      howTitle: 'Como criar seu vídeo Rumpelstiltskin com IA',
      handTitle: 'Fazendo manualmente: cinco elementos fixos',
      handIntro:
        'Se preferir criar o efeito em um modelo de imagem para vídeo, reconstrua o processo com personagem e cenário fixos e movimentos curtos:',
      handLinkBefore:
        'Prefere usar o Genjutsu com seu próprio modelo de vídeo? Veja o passo a passo:',
      handLink: 'Como criar um vídeo Rumpelstiltskin com IA no Genjutsu AI',
      rulesTitle: 'O que pode e o que não pode fazer com a tendência',
      rulesBefore: 'As regras completas estão em nossa',
      rulesLink: 'Política de Uso Aceitável',
      faqTitle: 'Perguntas frequentes sobre Rumpelstiltskin com IA',
      howToName: 'Como criar um vídeo Rumpelstiltskin com IA',
      articleAbout:
        'Tendência de vídeo Rumpelstiltskin (1987) na ponta dos pés com IA',
    },
  },
  fr: {
    faq: {
      origin: [
        'La scène Rumpelstiltskin de 1987 vient-elle d’un vrai film ?',
        'Un film Rumpelstiltskin est bien sorti en 1987 : une comédie musicale Cannon Movie Tales avec Billy Barty. Mais la scène de grange n’y figure pas. Le clip est généré par IA et a été publié sur Instagram en août 2026.',
      ],
      dance: [
        'Qu’est-ce que la danse Rumpelstiltskin ?',
        'C’est la danse furtive sur la pointe des pieds du clip viral : un petit homme en smoking de velours traverse une grange, fait signe de se taire à la caméra et danse tandis que la paille devient de l’or.',
      ],
      generate: [
        'Comment créer une vidéo Rumpelstiltskin IA ?',
        'Importez une image nette et ouvrez le modèle Rumpelstiltskin. Le personnage, la grange et le rendu film sont préconfigurés : aucun prompt à rédiger. La génération prend quelques minutes.',
      ],
      audio: [
        'Puis-je utiliser l’audio original ?',
        'Seulement si vous en détenez les droits. La chanson qui a popularisé la tendance est une sortie commerciale. Utilisez une piste autorisée ou un son de modèle sous licence.',
      ],
      year: [
        'Pourquoi l’année 1987 apparaît-elle si la vidéo est récente ?',
        'C’est une plaisanterie, mais aussi une information trompeuse. La légende vise à faire croire à un film perdu. Pour votre version, inventez un titre et précisez qu’elle est générée par IA.',
      ],
      song: [
        'Quelle chanson accompagne la vidéo Tiptoeing in My Jordans ?',
        '« Tip Toe Wing In My Jawwdinz » de Riff Raff (2013). Utilisez le son officiel dans TikTok ou Instagram Reels — les deux plateformes proposent l’audio sous licence.',
      ],
      halloween: [
        'Existe-t-il une version Halloween de la vidéo sur la pointe des pieds ?',
        'Oui. Ajoutez un chapeau de sorcière pointu, remplacez le décor de grange par des citrouilles sculptées, des feuilles d’automne et un léger brouillard, et gardez le rythme d’origine : 4 secondes d’approche, 4 de silence, 4 de sortie.',
      ],
      spelling: [
        'S’écrit-il « tiptoeing » ou « tip toeing » in my Jordans ?',
        "Les deux. La tendance a commencé sous « Tip Toein' in My Jordans » et Google traite les variantes comme une seule requête : tiptoeing, tip toeing, tip toein', tiptoing.",
      ],
    },
    steps: {
      image: [
        'Importez une image nette',
        "Choisissez une image nette et bien éclairée où le sujet est visible et dispose d'assez d'espace pour la posture de danse. Évitez le flou et les filtres prononcés.",
      ],
      template: [
        'Ouvrez le modèle Rumpelstiltskin',
        'Le personnage, la grange, l’or et le rendu de film des années 80 sont déjà définis. Vous n’avez pas besoin de rédiger de prompt.',
      ],
      render: [
        'Générez et téléchargez',
        'La vidéo HD se génère en quelques minutes, avec les pas, le geste de silence et l’or déjà chorégraphiés. Signalez l’IA lors de la publication.',
      ],
    },
    locks: {
      character: [
        'Fixez d’abord le personnage',
        'Créez une fiche de personnage de face, de profil et en pied avec un modèle d’image. Utilisez-la dans chaque plan pour éviter la dérive du visage.',
      ],
      set: [
        'Fixez le décor sur une image',
        'Générez d’abord une photographie de la grange : nuit, bottes de foin, lanterne, ombres profondes et rendu de pellicule. Si l’image paraît numérique, la vidéo aussi.',
      ],
      beats: [
        'Animez par séquences de 4 à 6 secondes',
        'Un mouvement par génération : pas sur la pointe des pieds, arrêt et doigt sur les lèvres, femme se retournant, danse. Les longues prises dérivent.',
      ],
      grade: [
        'Étalonnez comme une pellicule, pas comme un filtre',
        'Indiquez le support et ses défauts dans le prompt : « photogramme de conte de fées des années 1970, 16 mm, grain visible, mise au point douce, halo lumineux ». Ajoutez ensuite du grain et une légère oscillation verticale.',
      ],
      audio: [
        'Ajoutez l’audio en dernier',
        'Assurez-vous de disposer des droits : consultez la section ci-dessous.',
      ],
    },
    rules: {
      original:
        'Créez votre propre version. Rumpelstiltskin est un personnage des frères Grimm datant de 1812, dans le domaine public, sans ressemblance avec une personne vivante. Vous pouvez utiliser votre propre photo.',
      accurate_label:
        'Ne présentez pas le clip comme un vrai film. Rumpelstiltskin (1987) existe, avec des droits appartenant à Amazon MGM ; lui attribuer cette scène serait trompeur pour les créateurs et l’héritage de Billy Barty. Inventez plutôt un titre, un studio et une année fictifs.',
      consent:
        'N’utilisez pas d’images de personnes sans autorisation. Même si des versions mettant en scène des personnalités publiques circulent, vous devez disposer des droits et des consentements nécessaires pour modifier ou publier l’image d’autrui. Utilisez uniquement des images que vous êtes autorisé à modifier.',
      music:
        'N’utilisez pas la chanson de Riff Raff sans droits. « Tip Toe Wing in My Jawwdinz » est sorti chez Mad Decent ; une bibliothèque de sons tendance n’est pas en soi une licence. Choisissez une piste autorisée.',
      disclosure:
        'Signalez l’IA. Ajoutez « IA » sur la carte de titre elle-même, pas dans un commentaire invisible.',
    },
    sections: {
      whatTitle: 'Ce qu’est réellement le clip Rumpelstiltskin de 1987',
      whatP1:
        'Un petit homme aux cheveux roux ébouriffés, aux rides maquillées, en smoking de velours noir et nœud papillon, se cache derrière une botte de foin, avance sur la pointe des pieds, pose un doigt sur ses lèvres, danse dans la paille et transforme celle-ci en pièces d’or.',
      whatP2:
        'La légende indique 1987, mais cette scène n’existe pas dans le vrai film. Rumpelstiltskin (1987) était une comédie musicale Cannon Movie Tales tournée en Israël, avec Billy Barty dans son unique rôle principal : chapeau à plume, tunique brune et rouet dans un château. Ni grange ni smoking.',
      whatP3:
        'Le clip est généré par IA. Know Your Meme le rattache à un Reel Instagram du 27 août 2026 de @stroinaya, accompagné d’une publicité en russe pour un cours d’IA sans mentionner d’outil. Il a peu circulé jusqu’à fin septembre, quand quelqu’un lui a ajouté « Tip Toe Wing in My Jawwdinz » de Riff Raff (2014). Un TikTok du 29 septembre a lancé la vague. La vidéo a ensuite atteint X, où une republication a obtenu 11,4 millions de vues, puis TikTok, Reels et Shorts avec #tiptoeinginmyjordans. Les remplacements de personnages ont suivi en trois jours et beaucoup ont recherché un film inexistant.',
      imageAlt:
        'Rumpelstiltskin IA : vidéo de danse sur la pointe des pieds dans une grange, style film de 1987',
      lostTitle: 'Pourquoi on croit voir un film perdu',
      lostP1:
        'Trois éléments créent l’illusion : grain, étalonnage et légende. Flou doux, Technicolor chaud et saturé, léger tremblement de pellicule et carton à typographie ancienne annonçant « Rumpelstiltskin (1987) », alors que la source n’avait ni carton, ni filigrane, ni générique.',
      lostP2:
        'Les indices habituels de l’IA restent visibles : le visage change entre le geste de silence et le sourire, l’or apparaît d’un coup et aucun rouet n’est montré.',
      three: 'Trois étapes',
      howTitle: 'Comment créer votre vidéo Rumpelstiltskin IA',
      handTitle: 'Créer l’effet à la main : cinq éléments à fixer',
      handIntro:
        'Si vous préférez reconstruire l’effet dans un modèle image-vers-vidéo, fixez personnage et décor puis animez en courtes séquences :',
      handLinkBefore:
        'Vous préférez Genjutsu avec votre propre vidéo de référence ? Suivez notre guide pas à pas :',
      handLink: 'Créer une vidéo Rumpelstiltskin IA avec Genjutsu AI',
      rulesTitle: 'Ce que vous pouvez faire ou non avec cette tendance',
      rulesBefore: 'Retrouvez toutes les règles dans notre',
      rulesLink: 'Politique d’utilisation acceptable',
      faqTitle: 'FAQ Rumpelstiltskin IA',
      howToName: 'Comment créer une vidéo Rumpelstiltskin IA',
      articleAbout:
        'Tendance vidéo Rumpelstiltskin (1987) sur la pointe des pieds générée par IA',
    },
  },
  de: {
    faq: {
      origin: [
        'Ist der Rumpelstiltskin-Clip von 1987 aus einem echten Film?',
        '1987 erschien tatsächlich ein Rumpelstiltskin-Film – ein Cannon-Movie-Tales-Musical mit Billy Barty. Die Scheunenszene kommt darin jedoch nicht vor. Der Clip wurde mit KI erstellt und erstmals im August 2026 auf Instagram veröffentlicht.',
      ],
      dance: [
        'Was ist der Rumpelstiltskin-Tanz?',
        'Der freche Zehenspitzen-Tanz aus dem viralen Clip: Ein kleiner Mann im Samtsmoking schleicht durch eine Scheune, mahnt die Kamera zur Ruhe und tanzt, während Stroh zu Gold wird.',
      ],
      generate: [
        'Wie erstelle ich ein Rumpelstiltskin-KI-Video?',
        'Lade ein klares Bild hoch und öffne die Rumpelstiltskin-Vorlage. Figur, Scheune und Filmlook sind voreingestellt. Du brauchst keinen Prompt; das Video wird in einigen Minuten erstellt.',
      ],
      audio: [
        'Darf ich den Originalton verwenden?',
        'Nur wenn du die Rechte daran besitzt. Der Trend-Song ist eine kommerzielle Veröffentlichung. Nutze einen rechtmäßig lizenzierten Titel oder Vorlagensound.',
      ],
      year: [
        'Warum steht 1987 im Video, obwohl es nicht von damals ist?',
        'Das ist der Witz, aber auch irreführend. Der Titel soll wie ein verschollener Film wirken. Erfinde für deine Version einen Titel und kennzeichne sie als KI-generiert.',
      ],
      song: [
        'Welcher Song läuft im Tiptoeing-in-My-Jordans-Video?',
        '„Tip Toe Wing In My Jawwdinz“ von Riff Raff (2013). Nutze den offiziellen Sound in TikTok oder Instagram Reels — beide Plattformen haben die lizenzierte Audioversion.',
      ],
      halloween: [
        'Gibt es eine Halloween-Version des Zehenspitzen-Videos?',
        'Ja. Setze einen spitzen Hexenhut auf, tausche die Scheunen-Dekoration gegen geschnitzte Kürbisse, Herbstlaub und leichten Nebel und behalte das Original-Timing: 4 Sekunden Anschleichen, 4 Sekunden Shush, 4 Sekunden Abgang.',
      ],
      spelling: [
        'Heißt es „tiptoeing“ oder „tip toeing“ in my Jordans?',
        "Beides. Der Trend begann als „Tip Toein' in My Jordans“, und Google behandelt die Varianten als eine Suche: tiptoeing, tip toeing, tip toein', tiptoing.",
      ],
    },
    steps: {
      image: [
        'Klares Bild hochladen',
        'Wähle ein klares, gut beleuchtetes Bild, auf dem das Motiv und seine Tanzhaltung ausreichend zu sehen sind. Vermeide unscharfe Bilder und starke Filter.',
      ],
      template: [
        'Rumpelstiltskin-Vorlage öffnen',
        'Figur, Scheune, Gold und 80er-Filmlook sind bereits festgelegt. Mit dieser Vorlage entfällt das Schreiben eines Prompts.',
      ],
      render: [
        'Generieren und herunterladen',
        'Der HD-Clip wird in einigen Minuten erstellt, inklusive Zehenspitzen-Tanz, Ruhezeichen und Gold. Kennzeichne ihn beim Posten als KI.',
      ],
    },
    locks: {
      character: [
        'Zuerst die Figur festlegen',
        'Erstelle ein Character-Sheet mit Vorder-, Seiten- und Ganzkörperansicht. Nutze dieselbe Vorlage für jede Einstellung, damit das Gesicht nicht von Szene zu Szene abweicht.',
      ],
      set: [
        'Die Kulisse als Standbild festlegen',
        'Generiere zuerst ein Foto der Scheune: Nacht, Heuballen, eine Laterne, tiefe Schatten und Filmlook. Wenn das Standbild digital aussieht, wirkt das Video genauso.',
      ],
      beats: [
        'In 4–6-Sekunden-Bewegungen animieren',
        'Eine Bewegung pro Generierung: Zehenspitzen, Anhalten mit Finger auf den Lippen, Drehung der Frau, Tanz. Lange Einstellungen verlieren an Konsistenz.',
      ],
      grade: [
        'Farbkorrektur wie beim Film statt Filter',
        'Beschreibe im Prompt das Filmmaterial mit seinen Fehlern: „Märchenfilm-Standbild der 1970er, 16 mm, sichtbares Korn, weicher Fokus, Lichtsaum“. Füge anschließend Korn und ein leichtes vertikales Bildzittern hinzu.',
      ],
      audio: ['Audio zum Schluss', 'Kläre die Rechte – siehe unten.'],
    },
    rules: {
      original:
        'Erstelle eine eigene Version. Rumpelstilzchen ist eine Märchenfigur der Brüder Grimm aus dem Jahr 1812 und gemeinfrei, kein Abbild einer lebenden Person. Du kannst dein eigenes Foto verwenden.',
      accurate_label:
        'Tu nicht so, als stamme der Clip aus einem echten Film. Rumpelstiltskin (1987) existiert und die Rechte liegen bei Amazon MGM; eine falsche Zuordnung wäre irreführend gegenüber den Urhebern und dem Nachlass von Billy Barty. Erfinde besser einen fiktiven Filmtitel, ein Studio und ein Jahr.',
      consent:
        'Verwende keine Bilder von Personen ohne Erlaubnis. Auch wenn Versionen mit bekannten Persönlichkeiten im Umlauf sind, musst du die erforderlichen Rechte und gegebenenfalls Einwilligungen besitzen, um das Abbild einer anderen Person zu bearbeiten oder zu veröffentlichen. Verwende nur Bilder, die du bearbeiten darfst.',
      music:
        'Verwende den Riff-Raff-Titel nicht ohne Musikrechte. „Tip Toe Wing in My Jawwdinz“ erschien bei Mad Decent; eine Trend-Sound-Bibliothek ist keine allgemeine Lizenz. Nutze rechtmäßig freigegebenen Ton.',
      disclosure:
        'Kennzeichne das Ergebnis als KI. Schreibe „KI“ auf die Titelkarte selbst, nicht in einen versteckten Kommentar.',
    },
    sections: {
      whatTitle: 'Was der Rumpelstiltskin-Clip von 1987 wirklich ist',
      whatP1:
        'Ein kleiner Mann mit zerzausten roten Haaren, aufgemalten Falten, schwarzem Samtsmoking und Fliege lugt hinter einem Heuballen hervor, schleicht auf Zehenspitzen zur Kamera, legt einen Finger auf die Lippen, tanzt im Stroh und verwandelt es in Goldmünzen.',
      whatP2:
        'Die Beschriftung behauptet, die Szene sei von 1987. Im echten Film existiert sie nicht. Rumpelstiltskin (1987) war ein in Israel gedrehtes Cannon-Movie-Tales-Musical mit Billy Barty in seiner einzigen Hauptrolle. Er trug Federhut und braune Tunika und stand in einer Burg vor einem Spinnrad. Keine Scheune, kein Smoking.',
      whatP3:
        'Der Clip ist KI-generiert. Laut Know Your Meme stammt er von einem Instagram-Reel vom 27. August 2026 von @stroinaya; die russische Bildunterschrift bewarb einen KI-Kurs und nannte kein Tool. Der Clip blieb weitgehend unbeachtet, bis ihm Ende September jemand Riff Raffs „Tip Toe Wing in My Jawwdinz“ (2014) unterlegte. Ein TikTok-Post vom 29. September löste die Welle aus. Danach verbreitete er sich auf X – ein Repost erreichte 11,4 Millionen Aufrufe – sowie auf TikTok, Reels und Shorts unter #tiptoeinginmyjordans. Innerhalb von drei Tagen erschienen KI-Versionen mit anderen Gesichtern, während viele nach einem Film suchten, den es nie gab.',
      imageAlt:
        'Rumpelstiltskin-KI-Clip mit Zehenspitzen-Tanz in einer Scheune im Stil eines Films von 1987',
      lostTitle: 'Warum viele an einen verschollenen Film glauben',
      lostP1:
        'Drei Dinge sorgen für die Illusion: Filmkorn, Farbgebung und Titel. Weicher Fokus, warmes gesättigtes Technicolor, leichtes Bildzittern und eine historische Serifenschrift mit „Rumpelstiltskin (1987)“, obwohl das ursprüngliche Video keine Titelkarte, kein Wasserzeichen und keinen Abspann hatte.',
      lostP2:
        'Die typischen KI-Hinweise sind sichtbar: Das Gesicht verändert sich zwischen Ruhezeichen und Grinsen, das Gold erscheint auf einen Schlag und ein Spinnrad ist nie zu sehen.',
      three: 'Drei Schritte',
      howTitle: 'Dein eigenes Rumpelstiltskin-KI-Video erstellen',
      handTitle: 'Selbst bauen: fünf Dinge festlegen',
      handIntro:
        'Wenn du den Look mit einem Bild-zu-Video-Modell selbst erstellen möchtest, arbeite mit festen Figur- und Kulissenreferenzen und kurzen Bewegungsabschnitten:',
      handLinkBefore:
        'Du möchtest den Genjutsu-Generator mit deinem eigenen Referenzvideo nutzen? Hier ist die Schritt-für-Schritt-Anleitung:',
      handLink: 'Rumpelstiltskin-KI-Video mit Genjutsu AI erstellen',
      rulesTitle: 'Was bei diesem Trend erlaubt ist und was nicht',
      rulesBefore: 'Die vollständigen Regeln stehen in unserer',
      rulesLink: 'Richtlinie zur zulässigen Nutzung',
      faqTitle: 'Rumpelstiltskin KI – FAQ',
      howToName: 'Rumpelstiltskin-KI-Video erstellen',
      articleAbout:
        'KI-Rumpelstiltskin-Video-Trend (1987) mit Zehenspitzen-Tanz',
    },
  },
  ja: {
    faq: {
      origin: [
        '1987年版Rumpelstiltskinのシーンは本当の映画のものですか？',
        '1987年にはRumpelstiltskinの映画が公開されています——Billy Barty主演のCannon Movie Talesミュージカル——ですが、納屋のシーンは含まれていません。クリップはAI生成で、2026年8月にInstagramで初めて登場しました。',
      ],
      dance: [
        'Rumpelstiltskinダンスとは？',
        'バイラルクリップのつま先立ち納屋ダンスです。ベルベットのタキシードを着た小柄な男が納屋を忍び足で横切り、カメラに「シーッ」と合図し、わらが黄金に変わる間も踊り続けます。',
      ],
      generate: [
        'Rumpelstiltskin AI動画を作るには？',
        'はっきりした画像をアップロードし、Rumpelstiltskinテンプレートを開きます。キャラクター、納屋、映像ルックはすでに設定済み——プロンプトは不要です。動画の生成には数分かかります。',
      ],
      audio: [
        'オリジナル音源は使えますか？',
        '権利を保有している場合のみ可能です。トレンドを広めた楽曲は商用リリースです。クリア済みの音源かライセンスされたテンプレートサウンドを使用してください。',
      ],
      year: [
        '1987年と書いてあるのに、なぜその年ではないの？',
        'ジョークの一部ですが、誤解を招きます。タイトルは失われた映画に見せかけるためです。自分のバージョンでは架空のタイトルを考え、AIであることを明記してください。',
      ],
      song: [
        'Tiptoeing in My Jordans動画の曲は何？',
        'Riff Raffの「Tip Toe Wing In My Jawwdinz」（2013）。TikTokやInstagram Reelsでは公式サウンドを使ってください。どちらもライセンス済み音源を提供しています。',
      ],
      halloween: [
        'つま先立ち動画のハロウィン版はありますか？',
        'あります。とんがり魔女帽を足し、納屋の装飾をかぼちゃ・落ち葉・薄い霧に替え、元の4秒忍び寄る・4秒シーッ・4秒退場のタイミングを保ちます。',
      ],
      spelling: [
        '「tiptoeing」と「tip toeing」in my Jordans、どちらが正しい？',
        "どちらも使われます。トレンドは「Tip Toein' in My Jordans」から始まり、Googleは tiptoeing、tip toeing、tip toein'、tiptoing を同一クエリとして扱います。",
      ],
    },
    steps: {
      image: [
        'はっきりした画像をアップロード',
        '被写体が見え、ダンスのポーズに十分なスペースがある、明るく鮮明な画像を選びます。ぼやけた写真や強いフィルターは避けてください。',
      ],
      template: [
        'Rumpelstiltskinテンプレートを開く',
        'キャラクター、納屋、黄金、80年代映画ルックはすでに定義済みです。テンプレートを選べばプロンプトを書く必要はありません。',
      ],
      render: [
        '生成してダウンロード',
        'HDクリップは数分で生成され、つま先立ち、口封じ、黄金の演出はすでに振り付け済みです。投稿時はAIであると明記してください。',
      ],
    },
    locks: {
      character: [
        'まずキャラクターを固定',
        '正面、横、全身のキャラクターシートを作成します。顔がブレないよう、すべてのカットで同じリファレンスを使います。',
      ],
      set: [
        'セットを静止画で固定',
        'まず納屋の静止画を生成します：夜、干し草の俵、ランタン、深い影、フィルムルック。静止画がデジタルに見えるなら、動画もそうなります。',
      ],
      beats: [
        '4〜6秒のビート単位でアニメーション',
        '1回の生成につき1つの動き：つま先立ち、指を唇に当てて停止、女性の振り向き、ダンス。長いテイクは一貫性を失います。',
      ],
      grade: [
        'フィルタではなくフィルムのようにグレーディング',
        'プロンプトでフィルムストックとその欠点を記述します：「1970年代の童話静止画、16mm、目に見える粒子、ソフトフォーカス、ライトブルーム」。その後粒子と軽い縦方向の揺れを追加します。',
      ],
      audio: ['音声は最後', '権利をクリアしてください——下記を参照。'],
    },
    rules: {
      original:
        '自分だけのバージョンを作りましょう。Rumpelstiltskinは1812年のグリム兄弟の童話キャラクターでパブリックドメインであり、存命人物の似顔ではありません。自分の写真を使えます。',
      accurate_label:
        'クリップを本物の映画として提示しないでください。Rumpelstiltskin (1987)は実在し、権利はAmazon MGMにあります。このシーンを誤って帰属させると、制作者やBilly Bartyの遺産を誤解させます。代わりに架空のタイトル、スタジオ、年号を考えてください。',
      consent:
        '許可なく他人の画像を使わないでください。有名人版が流通していても、他人の似顔を編集・公開するには必要な権利と同意が必要です。編集を許可された画像だけを使ってください。',
      music:
        '音楽権利なしにRiff Raffの曲を使わないでください。「Tip Toe Wing in My Jawwdinz」はMad Decentからリリースされています。トレンドサウンドライブラリは一般的なライセンスではありません。クリア済みの音源を使ってください。',
      disclosure:
        '結果をAIと明記してください。「AI」はタイトルカード自体に入れ、隠れたコメントではなく。',
    },
    sections: {
      whatTitle: '1987年版Rumpelstiltskinクリップの正体',
      whatP1:
        'くせ毛の赤毛、描き込まれたしわ、黒いベルベットのタキシードと蝶ネクタイを着た、子供サイズの男が干し草の俵の後ろから顔を出し、つま先立ちでカメラに近づき、唇に指を当て、わらの中で踊り、それを金貨の山に変えます。',
      whatP2:
        'キャプションは1987年と主張していますが、そのシーンは実際の映画にはありません。Rumpelstiltskin (1987)はイスラエルで撮影されたCannon Movie Talesのミュージカルで、Billy Bartyが唯一の主演を務めました——羽根付き帽子、茶色のチュニック、城の部屋の糸車。納屋もタキシードもありません。',
      whatP3:
        'クリップはAI生成です。Know Your Memeは、2026年8月27日の@stroinayaによるInstagram Reelに遡ります。ロシア語のキャプションはAI講座を宣伝し、ツール名は一切出していません。9月下旬まで静かに留まり、誰かがRiff Raffの「Tip Toe Wing in My Jawwdinz」(2014)を追加しました。9月29日のTikTok投稿が波を起こしました。その後Xに広がり——1件の再投稿が1140万回再生——TikTok、Reels、Shortsでも#tiptoeinginmyjordansの下で拡散しました。3日以内にAI顔差し替えが現れ、多くの人が存在しなかった映画を探しました。',
      imageAlt:
        '1987年映画風にスタイリングされた納屋でのつま先立ちダンスのRumpelstiltskin AIクリップ',
      lostTitle: 'なぜ失われた映画に見えるのか',
      lostP1:
        '錯覚を売るのは三つ：粒子、グレーディング、キャプション。ソフトフォーカス、暖かく彩度の高いテクニカラー、軽いフレームの揺れ、そして古風なタイポグラフィのタイトルカード「Rumpelstiltskin (1987)」——元ソースにはタイトルカードも透かしもクレジットもありませんでした。',
      lostP2:
        '通常のAIの痕跡は残っています：口封じと笑顔の間で顔が変わり、黄金が一気に現れ、糸車は一度も映りません。',
      three: '三つのステップ',
      howTitle: 'Rumpelstiltskin AI動画の作り方',
      handTitle: '手作りで再現する：五つの固定ポイント',
      handIntro:
        '画像から動画モデルでルックを再現したい場合は、キャラクターとセットのリファレンスを固定し、短いビート単位でアニメーションします：',
      handLinkBefore:
        '自分の参照動画でGenjutsuを使いたいですか？ステップバイステップはこちら：',
      handLink: 'Genjutsu AIでRumpelstiltskin AI動画を作る',
      rulesTitle: 'このトレンドでできること・できないこと',
      rulesBefore: '完全なルールは',
      rulesLink: '利用許諾ポリシー',
      faqTitle: 'Rumpelstiltskin AI FAQ',
      howToName: 'Rumpelstiltskin AI動画の作り方',
      articleAbout: 'Rumpelstiltskin 1987 つま先立ちAI動画トレンド',
    },
  },
  ko: {
    faq: {
      origin: [
        '1987년 Rumpelstiltskin 장면은 실제 영화에서 나온 것인가요?',
        '1987년에 Rumpelstiltskin 영화가 개봉했습니다 — Billy Barty 주연의 Cannon Movie Tales 뮤지컬 — 하지만 헛간 장면은 포함되어 있지 않습니다. 클립은 AI로 생성되었으며 2026년 8월 Instagram에서 처음 등장했습니다.',
      ],
      dance: [
        'Rumpelstiltskin 댄스란?',
        '바이럴 클립의 까치발 헛간 댄스입니다. 벨벳 턱시도를 입은 작은 남자가 헛간을 살금살금 가로지르고, 카메라에 쉿 하며, 짚이 금으로 바뀌는 동안 계속 춤춥니다.',
      ],
      generate: [
        'Rumpelstiltskin AI 영상은 어떻게 만드나요?',
        '선명한 이미지를 업로드하고 Rumpelstiltskin 템플릿을 여세요. 캐릭터, 헛간, 영화 룩은 이미 설정되어 있어 프롬프트를 쓸 필요가 없습니다. 영상 생성에는 몇 분 걸립니다.',
      ],
      audio: [
        '원본 오디오를 사용할 수 있나요?',
        '권리를 보유한 경우에만 가능합니다. 트렌드를 대중화한 곡은 상업적으로 발매된 음원입니다. 클리어된 오디오나 라이선스된 템플릿 사운드를 사용하세요.',
      ],
      year: [
        '그때 작품이 아닌데 왜 1987년이라고 하나요?',
        '농담의 일부이지만 오해를 부르기도 합니다. 제목은 잃어버린 영화처럼 보이게 하려는 것입니다. 자신의 버전에서는 가상의 제목을 만들고 AI임을 표시하세요.',
      ],
      song: [
        'Tiptoeing in My Jordans 영상의 노래는 무엇인가요?',
        'Riff Raff의 「Tip Toe Wing In My Jawwdinz」(2013). TikTok이나 Instagram Reels에서는 공식 사운드를 쓰세요. 두 플랫폼 모두 라이선스된 오디오를 제공합니다.',
      ],
      halloween: [
        '발끝걸음 영상의 할로윈 버전이 있나요?',
        '있습니다. 뾰족한 마녀 모자를 더하고, 헛간 장식을 조각 호박·가을 낙엽·옅은 안개로 바꾸며, 원래의 4초 살금·4초 쉿·4초 퇴장 타이밍을 유지하세요.',
      ],
      spelling: [
        '「tiptoeing」과 「tip toeing」in my Jordans, 어느 쪽이 맞나요?',
        "둘 다입니다. 트렌드는 「Tip Toein' in My Jordans」로 시작했고, Google은 tiptoeing, tip toeing, tip toein', tiptoing을 하나의 검색어로 취급합니다.",
      ],
    },
    steps: {
      image: [
        '선명한 이미지 업로드',
        '피사체가 보이고 댄스 자세를 취할 공간이 충분한, 밝고 선명한 이미지를 고르세요. 흐릿한 사진과 강한 필터는 피하세요.',
      ],
      template: [
        'Rumpelstiltskin 템플릿 열기',
        '캐릭터, 헛간, 금, 80년대 영화 룩은 이미 정의되어 있습니다. 템플릿을 선택하면 프롬프트를 쓸 필요가 없습니다.',
      ],
      render: [
        '생성 및 다운로드',
        'HD 클립은 몇 분 만에 생성되며, 까치발 걸음, 쉿 제스처, 금 연출은 이미 안무가 짜여 있습니다. 게시할 때 AI임을 표시하세요.',
      ],
    },
    locks: {
      character: [
        '먼저 캐릭터 고정',
        '정면, 측면, 전신 뷰가 있는 캐릭터 시트를 만드세요. 얼굴이 흔들리지 않도록 모든 샷에 같은 레퍼런스를 사용합니다.',
      ],
      set: [
        '세트를 정지 화면으로 고정',
        '먼저 헛간 정지 화면을 생성하세요: 밤, 건초 더미, 랜턴, 깊은 그림자, 필름 룩. 정지 화면이 디지털로 보이면 영상도 그렇습니다.',
      ],
      beats: [
        '4~6초 비트 단위로 애니메이션',
        '생성당 하나의 동작: 까치발, 입술에 손가락을 대고 멈춤, 여성의 돌아섬, 댄스. 긴 테이크는 일관성을 잃습니다.',
      ],
      grade: [
        '필터가 아닌 영화처럼 그레이딩',
        '프롬프트에 필름 스톡과 결함을 기술하세요: 「1970년대 동화풍 정지 화면, 16mm, 뚜렷한 필름 그레인, 소프트 포커스, 라이트 블룸」. 그다음 그레인과 가벼운 세로 흔들림을 추가합니다.',
      ],
      audio: ['오디오는 마지막', '권리를 확보하세요 — 아래를 참고하세요.'],
    },
    rules: {
      original:
        '자신만의 버전을 만드세요. Rumpelstiltskin은 1812년 그림 형제의 동화 캐릭터로 퍼블릭 도메인이며, 생존 인물의 초상이 아닙니다. 자신의 사진을 사용할 수 있습니다.',
      accurate_label:
        '클립을 실제 영화로 제시하지 마세요. Rumpelstiltskin (1987)은 존재하며 권리는 Amazon MGM에 있습니다. 이 장면을 잘못 귀속하면 제작자와 Billy Barty의 유산을 오도합니다. 대신 가상의 제목, 스튜디오, 연도를 만드세요.',
      consent:
        '허가 없이 타인의 이미지를 사용하지 마세요. 유명인 버전이 유통되더라도, 타인의 초상을 편집하거나 게시하려면 필요한 권리와 동의가 있어야 합니다. 수정할 권한이 있는 이미지만 사용하세요.',
      music:
        '음악 권리 없이 Riff Raff 곡을 사용하지 마세요. 「Tip Toe Wing in My Jawwdinz」는 Mad Decent에서 발매되었습니다. 트렌드 사운드 라이브러리는 일반 라이선스가 아닙니다. 클리어된 오디오를 사용하세요.',
      disclosure:
        '결과물을 AI로 표시하세요. 「AI」는 제목 카드 자체에 넣고, 숨겨진 댓글에 넣지 마세요.',
    },
    sections: {
      whatTitle: '1987년 Rumpelstiltskin 클립의 실체',
      whatP1:
        '곱슬거리는 붉은 머리, 그려 넣은 주름, 검은 벨벳 턱시도와 나비넥타이를 한 아이 크기의 남자가 건초 더미 뒤에서 고개를 내밀고, 까치발로 카메라 쪽으로 다가와 입술에 손가락을 대고, 짚 위에서 춤을 추며 그것을 금화 더미로 바꿉니다.',
      whatP2:
        '캡션은 1987년이라고 주장하지만, 그 장면은 실제 영화에 없습니다. Rumpelstiltskin (1987)은 이스라엘에서 촬영된 Cannon Movie Tales 뮤지컬로, Billy Barty가 유일한 주연을 맡았습니다 — 깃털 모자, 갈색 튜닉, 성 방의 물레. 헛간도 턱시도도 없습니다.',
      whatP3:
        '클립은 AI로 생성되었습니다. Know Your Meme는 2026년 8월 27일 @stroinaya의 Instagram Reel로 거슬러 올라갑니다. 러시아어 캡션은 AI 강좌를 홍보했고 도구 이름은 언급하지 않았습니다. 9월 말까지 조용하다가 누군가 Riff Raff의 「Tip Toe Wing in My Jawwdinz」(2014)를 추가했습니다. 9월 29일 TikTok 게시물이 물결을 일으켰습니다. 이후 X에 퍼졌고 — 재게시 하나가 1,140만 조회 — TikTok, Reels, Shorts에서 #tiptoeinginmyjordans 아래 확산되었습니다. 3일 안에 AI 얼굴 스왑이 나타났고, 많은 사람이 존재하지 않던 영화를 찾았습니다.',
      imageAlt:
        '1987년 영화풍으로 스타일링된 헛간에서 까치발 댄스를 하는 Rumpelstiltskin AI 클립',
      lostTitle: '왜 잃어버린 영화처럼 보이는가',
      lostP1:
        '착각을 만드는 세 가지: 그레인, 그레이딩, 캡션. 소프트 포커스, 따뜻하고 채도 높은 테크니컬러, 가벼운 프레임 흔들림, 그리고 「Rumpelstiltskin (1987)」이라고 적힌 옛날식 타이틀 카드 — 원본에는 타이틀 카드, 워터마크, 크레딧이 없었습니다.',
      lostP2:
        '흔한 AI 흔적은 남아 있습니다: 쉿과 웃음 사이에 얼굴이 바뀌고, 금이 한꺼번에 나타나며, 물레는 한 번도 보이지 않습니다.',
      three: '세 단계',
      howTitle: 'Rumpelstiltskin AI 영상 만드는 방법',
      handTitle: '직접 만들기: 다섯 가지 고정',
      handIntro:
        '이미지-투-비디오 모델에서 룩을 재현하려면 캐릭터와 세트 레퍼런스를 고정하고 짧은 비트 단위로 애니메이션하세요:',
      handLinkBefore:
        '자신의 참조 영상으로 Genjutsu를 쓰고 싶으신가요? 단계별 가이드:',
      handLink: 'Genjutsu AI로 Rumpelstiltskin AI 영상 만들기',
      rulesTitle: '이 트렌드에서 할 수 있는 것과 없는 것',
      rulesBefore: '전체 규칙은',
      rulesLink: '허용 가능한 사용 정책',
      faqTitle: 'Rumpelstiltskin AI FAQ',
      howToName: 'Rumpelstiltskin AI 영상 만드는 방법',
      articleAbout: 'Rumpelstiltskin 1987 까치발 AI 영상 트렌드',
    },
  },
};
export function getRumpelSeoCopy(locale: string): RumpelSeoCopy | null {
  return copies[locale] ?? null;
}
