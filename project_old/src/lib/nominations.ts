export type Nomination = {
  id: string
  label: string
  correct: string
}

export const nominations: Nomination[] = [
  { id: 'n1', label: 'Излучающий светлую Энергию', correct: 'Пономарева Е.Е.' },
  { id: 'n2', label: 'Мастер сарказма', correct: 'Бенвовская Ю.С.' },
  { id: 'n3', label: 'Самый Тихоня', correct: 'Гутче А.И.' },
  { id: 'n4', label: 'Самый голодный', correct: 'Карпюк О.В.' },
  { id: 'n5', label: 'Самый пошлый', correct: 'Шомесова Е.П.' },
  { id: 'n6', label: 'Топ Манипулятор', correct: 'Заколодяжная И.В.' },
  { id: 'n7', label: 'Ищет настоящего себя', correct: 'Пруткевич Е.Р.' },
  { id: 'n8', label: 'Человек с избыточным потенциалом', correct: 'Батманов И.А.' },
  { id: 'n9', label: '3000 слов в минуту', correct: 'Красоцкая А.Н.' },
  { id: 'n10', label: 'Человек, которого не понимают', correct: 'Шигапова З.М.' },
]
