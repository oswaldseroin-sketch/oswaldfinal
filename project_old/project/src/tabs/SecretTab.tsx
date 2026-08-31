import { useCallback, useState } from 'react'
import { DoorOpen, Flame, Plus, X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import BackButton from '../components/BackButton'
import SecretQuest from '../components/SecretQuest'
import { getItem, removeItem } from '../lib/storage'

type SecretTabProps = { onBack: () => void }

export default function SecretTab({ onBack }: SecretTabProps) {
  const { memes, isAdmin, addMeme, loading } = useApp()
  const [open, setOpen] = useState(false)
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [questUnlocked, setQuestUnlocked] = useState(() => getItem<boolean>('secret-quest-passed', false))

  const unlockQuest = useCallback(() => setQuestUnlocked(true), [])

  const leaveQuest = useCallback(() => {
    removeItem('secret-quest-passed')
    setQuestUnlocked(false)
  }, [])

  const submit = async (): Promise<void> => {
    if (!description.trim()) return
    const saved = await addMeme(description.trim(), imageUrl.trim())
    if (saved) {
      setDescription('')
      setImageUrl('')
      setOpen(false)
    }
  }

  return (
          <div className="mx-auto min-h-screen max-w-md px-4 pb-32 pt-6 overflow-y-auto">


      <BackButton onBack={onBack} />
      <div className="mb-7 flex items-start justify-between">
        <div>
          <p className="text-[10px] font-bold tracking-widest text-accent">АМАЛЬГАМА / 04</p>
          <h1 className="mt-1 text-3xl font-extrabold text-ink">Секретная</h1>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10">
          <Flame size={22} color="#ff2bd6" />
        </div>
      </div>

      {!questUnlocked ? (
        <SecretQuest onUnlocked={unlockQuest} />
      ) : (
        <>
          <div className="mb-4 flex flex-col items-center">
            <img
              src="https://lh3.googleusercontent.com/d/1pnfg4Tz__Sp0AquLUdxulwix2DZh9Tlu"
              alt="Секретная комната"
              className="w-full max-w-sm h-auto rounded-2xl border-2 border-pink-500/60 object-cover"
              style={{ boxShadow: '0 0 40px rgba(236,72,153,0.5)' }}
              onError={(e) => { (e.target as HTMLImageElement).src = 'https://drive.google.com/uc?id=1pnfg4Tz__Sp0AquLUdxulwix2DZh9Tlu'; }}
            />
          </div>
          {loading ? (
            <p className="py-10 text-center text-sm text-ink-muted">Загрузка ленты...</p>
          ) : memes.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-20">
              <Flame size={38} color="#5a6172" />
              <p className="mt-4 text-lg font-extrabold text-ink">Пока тихо</p>
              <p className="mt-2 text-center text-xs leading-relaxed text-ink-muted">
                В секретной комнате пока пусто. Нажмите +, чтобы закинуть первый угар!
              </p>
            </div>
          ) : (
            <div className="space-y-3 pb-4">
              {memes.map((meme) => (
                <div key={meme.id} className="rounded-2xl border border-line bg-card/70 p-4 backdrop-blur-md">
                  <p className="text-base font-semibold leading-relaxed text-ink">{meme.description}</p>
                  {meme.image_url && (
                    <img
                      src={meme.image_url}
                      alt=""
                      className="mt-3.5 h-48 w-full rounded-xl object-cover bg-input"
                      onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
                    />
                  )}
                  <p className="mt-4 text-[9px] tracking-widest text-ink-faint">ТОЛЬКО ДЛЯ СВОИХ</p>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={leaveQuest}
            className="mt-6 mb-2 flex w-full items-center justify-center gap-2 rounded-xl border border-accent/40 bg-accent/10 py-3 text-sm font-bold text-accent transition-transform active:scale-95"
          >
            <DoorOpen size={18} />
            Покинуть секретную комнату
          </button>

          {isAdmin && (
            <button
              onClick={() => setOpen(true)}
              className="fixed bottom-24 right-4 z-30 flex items-center justify-center rounded-full bg-accent text-ink transition-transform active:scale-90"
              style={{ width: 52, height: 52, boxShadow: '0 4px 14px rgba(255,43,214,0.5)' }}
            >
              <Plus size={25} strokeWidth={2.8} />
            </button>
          )}

          {open && (
            <div className="fixed inset-0 z-50 flex items-end bg-black/70 animate-fadeIn" onClick={() => setOpen(false)}>
              <div
                className="w-full rounded-t-3xl border-t border-accent/30 bg-card/80 p-6 pb-8 backdrop-blur-md animate-slideUp"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-extrabold text-ink">Новый угар</h2>
                  <button onClick={() => setOpen(false)} className="text-ink-muted"><X size={19} /></button>
                </div>
                <p className="mt-1 text-sm text-ink-muted">Поделитесь чем-то для своих</p>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Текст описания"
                  rows={3}
                  className="mt-5 w-full rounded-xl border border-line bg-input px-4 py-3 text-sm text-ink outline-none focus:border-accent/50 placeholder:text-ink-faint"
                />
                <input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="Ссылка на картинку URL (необязательно)"
                  className="mt-2.5 h-13 w-full rounded-xl border border-line bg-input px-4 py-3 text-sm text-ink outline-none focus:border-accent/50 placeholder:text-ink-faint"
                />
                <button
                  onClick={() => void submit()}
                  className="mt-4 h-13 w-full rounded-xl bg-accent text-sm font-extrabold text-ink transition-transform active:scale-95"
                >
                  Закинуть в комнату
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
