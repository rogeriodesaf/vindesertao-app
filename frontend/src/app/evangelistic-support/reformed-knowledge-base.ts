export interface ReformedAnswer {
  id: string;
  category: string;
  question: string;
  keywords: string[];
  answer: string;
  references: string[];
  pastoralNote?: string;
}

export const reformedKnowledgeBase: ReformedAnswer[] = [
  {
    id: 'salvacao-pela-graca',
    category: 'Salvação',
    question: 'Como explicar salvação pela graça?',
    keywords: ['salvacao', 'salvação', 'graca', 'graça', 'fe', 'fé', 'obras', 'merecimento'],
    answer: 'Explique que a salvação não é uma recompensa por boas obras, mas um presente de Deus recebido pela fé em Cristo. As boas obras são fruto da salvação, não a causa dela. Uma forma simples de dizer é: Deus salva pecadores pela graça, por meio da fé, com base na obra suficiente de Jesus Cristo.',
    references: ['Efésios 2.8-10', 'Romanos 3.23-24', 'Tito 3.4-7', 'Confissão de Fé de Westminster 11'],
    pastoralNote: 'Evite transformar a conversa em debate. Mostre que a graça humilha o orgulho humano e aponta para a suficiência de Cristo.'
  },
  {
    id: 'arrependimento',
    category: 'Salvação',
    question: 'O que é arrependimento?',
    keywords: ['arrependimento', 'arrepender', 'pecado', 'mudar', 'conversao', 'conversão'],
    answer: 'Arrependimento é uma mudança real diante de Deus: a pessoa reconhece o pecado, sente tristeza por ter ofendido a Deus e se volta para Cristo com desejo de abandonar o pecado. Não é apenas remorso ou medo das consequências; envolve voltar-se para Deus.',
    references: ['Atos 3.19', '2 Coríntios 7.10', 'Marcos 1.15', 'Breve Catecismo de Westminster 87'],
    pastoralNote: 'Se a pessoa demonstrar sofrimento profundo ou culpa intensa, escute com cuidado e encaminhe ao líder ou pastor.'
  },
  {
    id: 'fe-em-cristo',
    category: 'Salvação',
    question: 'O que significa crer em Jesus?',
    keywords: ['crer', 'jesus', 'cristo', 'fe', 'fé', 'confiar', 'salvador'],
    answer: 'Crer em Jesus não é apenas acreditar que Ele existe. É confiar nele como Salvador e Senhor, descansando na sua morte e ressurreição como única base de reconciliação com Deus.',
    references: ['João 3.16', 'João 14.6', 'Romanos 10.9-13', 'Breve Catecismo de Westminster 86']
  },
  {
    id: 'pecado-original',
    category: 'Pecado',
    question: 'Como explicar o pecado original?',
    keywords: ['pecado original', 'adao', 'adão', 'natureza pecaminosa', 'culpa', 'queda'],
    answer: 'Explique que a Bíblia ensina que a humanidade caiu em pecado em Adão. Por isso, não somos pecadores apenas porque cometemos atos errados; cometemos pecados porque nossa natureza foi afetada pela queda. Precisamos de um novo nascimento e de um Salvador.',
    references: ['Romanos 5.12-19', 'Salmo 51.5', 'Efésios 2.1-3', 'Confissão de Fé de Westminster 6'],
    pastoralNote: 'Use linguagem simples. A intenção é mostrar a necessidade de Cristo, não vencer uma discussão filosófica.'
  },
  {
    id: 'eleicao',
    category: 'Doutrina de Deus',
    question: 'Como falar sobre eleição sem gerar confusão?',
    keywords: ['eleicao', 'eleição', 'predestinacao', 'predestinação', 'escolhidos', 'soberania'],
    answer: 'Em evangelismo, comece pelo chamado claro do evangelho: todos são convidados a se arrepender e crer em Cristo. A eleição mostra que a salvação vem da graça soberana de Deus, não do mérito humano. Se a pessoa perguntar, explique com humildade: Deus salva pecadores por graça, e isso deve produzir segurança, gratidão e adoração, não arrogância.',
    references: ['Efésios 1.3-6', 'João 6.37', 'Romanos 8.29-30', 'Cânones de Dort I'],
    pastoralNote: 'Se a conversa ficar polêmica, volte para Cristo, arrependimento e fé. Dúvidas mais profundas devem ser encaminhadas ao líder.'
  },
  {
    id: 'todas-religioes',
    category: 'Apologética',
    question: 'Como responder quando alguém diz que todas as religiões levam a Deus?',
    keywords: ['religioes', 'religiões', 'todos caminhos', 'todas levam', 'deus', 'exclusividade'],
    answer: 'Responda com respeito: Jesus não se apresentou como apenas um caminho entre muitos, mas como o caminho, a verdade e a vida. O cristianismo anuncia reconciliação com Deus por meio da pessoa e obra de Cristo, não por esforço religioso humano.',
    references: ['João 14.6', 'Atos 4.12', '1 Timóteo 2.5'],
    pastoralNote: 'Evite desprezar a história da pessoa. Faça perguntas, escute e apresente Cristo com mansidão.'
  },
  {
    id: 'sofrimento',
    category: 'Vida Cristã',
    question: 'O que dizer a alguém que está sofrendo?',
    keywords: ['sofrimento', 'dor', 'luto', 'doenca', 'doença', 'perda', 'tristeza'],
    answer: 'Não tente explicar tudo rapidamente. Escute, demonstre compaixão e mostre que Deus não é indiferente ao sofrimento. Cristo conhece a dor humana, chama cansados a irem a Ele e oferece esperança real. Ore com a pessoa se ela permitir.',
    references: ['Mateus 11.28-30', 'Salmo 34.18', 'Romanos 8.18-39', 'Hebreus 4.14-16'],
    pastoralNote: 'Em casos de luto intenso, risco de autoagressão, violência, abuso ou sofrimento extremo, acione imediatamente a liderança responsável.'
  },
  {
    id: 'certeza-salvacao',
    category: 'Vida Cristã',
    question: 'Como falar sobre certeza da salvação?',
    keywords: ['certeza', 'seguranca', 'segurança', 'salvacao', 'salvação', 'perder salvacao'],
    answer: 'A segurança do cristão está em Cristo, não na força da própria fé. Quem confia verdadeiramente em Cristo pode encontrar consolo nas promessas de Deus, no testemunho do Espírito e nos frutos de uma vida transformada.',
    references: ['João 10.27-29', 'Romanos 8.1', 'Romanos 8.38-39', 'Confissão de Fé de Westminster 18'],
    pastoralNote: 'Não trate dúvidas sinceras com dureza. Encoraje a pessoa a buscar Cristo, a Palavra, oração e acompanhamento pastoral.'
  },
  {
    id: 'oracao-campo',
    category: 'Prática em Campo',
    question: 'Como orar com uma pessoa visitada?',
    keywords: ['orar', 'oracao', 'oração', 'pedido', 'visita', 'campo'],
    answer: 'Peça permissão antes de orar. Ore de forma breve, bíblica e respeitosa. Agradeça pela vida da pessoa, apresente a necessidade a Deus e peça que Cristo seja conhecido. Evite prometer curas, resultados financeiros ou respostas que Deus não prometeu especificamente.',
    references: ['Filipenses 4.6-7', '1 Pedro 5.7', 'Tiago 5.13'],
    pastoralNote: 'Se a pessoa compartilhar algo sensível, preserve a privacidade e encaminhe à liderança quando necessário.'
  },
  {
    id: 'abordagem-respeitosa',
    category: 'Prática em Campo',
    question: 'Como abordar alguém com respeito?',
    keywords: ['abordagem', 'respeito', 'evangelizar', 'casa', 'porta', 'conversa'],
    answer: 'Apresente-se com clareza, explique o motivo da visita e respeite se a pessoa não quiser conversar. O evangelismo reformado não precisa ser frio ou agressivo: anunciamos a verdade com mansidão, confiança em Deus e amor ao próximo.',
    references: ['1 Pedro 3.15-16', 'Colossenses 4.5-6', '2 Timóteo 2.24-25']
  }
];
