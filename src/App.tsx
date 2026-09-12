import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Database,
  Download,
  ExternalLink,
  FileText,
  GraduationCap,
  Home as HomeIcon,
  Layers3,
  ListChecks,
  Search,
  ShieldCheck,
  Target,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { courseConfig } from './config'
import labsPayload from './data/labs.json'
import { resolveLab } from './lib/resolveLab'
type StepGuide = { data:string; result:string; check:string }

import {personalizeText} from './lib/personalize'

import {SiteControls, usePreferences, PreferencesProvider} from './Preferences'
import subjectAreasPayload from './data/subject-areas.json'
import type { DataTable, Lab, QualityProfile, SubjectArea } from './types'

const labs = (labsPayload as { labs: Lab[] }).labs
const { profiles, subjectAreas } = subjectAreasPayload as { profiles: QualityProfile[]; subjectAreas: SubjectArea[] }
function useRoute() {
  const readHash = () => window.location.hash || '#/'
  const [hash, setHash] = useState(readHash)

  useEffect(() => {
    const onHashChange = () => setHash(readHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const match = hash.match(/^#\/lab\/([78]-\d{2})(?:$|[/?])/)
  return match ? { kind: 'lab' as const, slug: match[1] } : { kind: 'home' as const }
}

function CourseApp() {
  const route = useRoute()
  const lab = route.kind === 'lab' ? labs.find((item) => item.slug === route.slug) : undefined
  const [subjectAreaId, setSubjectAreaId] = useState(() => {
    const saved = Number(window.localStorage.getItem('itpsis-subject-area'))
    return subjectAreas.some(a=>a.id===saved)?saved:subjectAreas[0].id
  })
  const subjectArea = subjectAreas.find((item) => item.id === subjectAreaId) ?? subjectAreas[0]
  const profile = profiles.find((item) => item.id === subjectArea.profileId) ?? profiles[0]

  const selectSubjectArea = (id: number) => {
    setSubjectAreaId(id)
    window.localStorage.setItem('itpsis-subject-area', String(id))
  }

  useEffect(() => {
    const skipLink = document.querySelector<HTMLAnchorElement>('.skip-link')
    const handleSkip = (event: Event) => {
      event.preventDefault()
      const main = document.getElementById('main-content')
      window.setTimeout(() => {
        main?.focus({ preventScroll: true })
        main?.scrollIntoView({ block: 'start' })
      }, 0)
    }
    skipLink?.addEventListener('click', handleSkip)
    return () => skipLink?.removeEventListener('click', handleSkip)
  }, [])

  useEffect(() => {
    document.title = lab
      ? `ЛР ${lab.slug}. ${lab.title} — ${courseConfig.code}`
      : `Лабораторные работы — ${courseConfig.code}`
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [lab, route.kind])

  if (route.kind === 'lab' && lab) return <><LabPage lab={lab} subjectArea={subjectArea} profile={profile} onSubjectAreaChange={selectSubjectArea} /></>
  if (route.kind === 'lab') return <NotFound />
  return <><SiteControls downloadSemester={sem=>bundle(labs.filter(l=>sem===null||l.semester===sem),subjectArea,profile)} /><Home subjectArea={subjectArea} profile={profile} onSubjectAreaChange={selectSubjectArea} /></>
}

function Brand() {
  return (
    <a className="brand" href="#/" aria-label="На главную страницу курса">
      <img src={`${import.meta.env.BASE_URL}${courseConfig.logo}`} alt="Университет Синергия" />
      <span>
        <strong>{courseConfig.code}</strong>
        <small>{courseConfig.discipline}</small>
      </span>
    </a>
  )
}

function Home({ subjectArea, profile, onSubjectAreaChange }: { subjectArea: SubjectArea; profile: QualityProfile; onSubjectAreaChange: (id: number) => void }) {
  const [query, setQuery] = useState('')
  const [semester, setSemester] = useState<string>('all')
  const preferences=usePreferences()
  const visibleLabs = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('ru-RU')
    return labs.filter((lab) => {
      const matchesSemester = semester === 'all' || lab.semester === Number(semester)
      const haystack = `${lab.number} ${lab.title} ${lab.topicCode} ${lab.topicTitle} ${lab.practicalResult}`.toLocaleLowerCase('ru-RU')
      return matchesSemester && (!normalized || haystack.includes(normalized))
    })
  }, [query, semester])

  return (
    <div className="site-shell">
      <header className="site-header">
        <Brand />

      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="hero" aria-labelledby="course-title">
          <div className="hero-copy">
            <p className="eyebrow">{new Set(labs.map(l=>l.semester)).size} семестра · {labs.length} лабораторных работ · {labs.reduce((sum,l)=>sum+l.points,0)} баллов</p>
            <h1 id="course-title">{courseConfig.heroTitle} <span>{courseConfig.heroAccent}</span></h1>
            <p className="hero-lead">
              {courseConfig.slogan}
            </p>
            <div className="hero-teacher"><span>Преподаватель</span><strong>{preferences.profile.name||'ФИО преподавателя'}</strong><p>{preferences.profile.position||'Должность'}</p><p>{preferences.profile.department||'Кафедра или лаборатория'}</p></div>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <div className="hero-chevron" />
            <img src={`${import.meta.env.BASE_URL}${courseConfig.mascot}`} alt="" />
          </div>
        </section>

        <section className="block-section" id="blocks" aria-labelledby="blocks-title">
          <div className="section-heading">
            <p className="eyebrow">Структура курса</p>
            <h2 id="blocks-title">{courseConfig.blocksTitle}</h2>
            <p>{courseConfig.blocksDescription}</p>
          </div>
          <div className="block-grid">
            {courseConfig.semesters.map((sem,i)=>{const group=labs.filter(l=>l.semester===sem);return <BlockCard key={sem} block={i+1} title={group[0]?.blockTitle||'Учебный блок'} semester={sem} count={group.length} points={group.reduce((n,l)=>n+l.points,0)} icon={i===0?<Database/>:<ShieldCheck/>}/>})}
          </div>
        </section>

        <SubjectAreaPicker value={subjectArea} profile={profile} onChange={onSubjectAreaChange} />

        <section className="catalog-section" id="labs" aria-labelledby="labs-title">
          <div className="section-heading catalog-heading">
            <div>
              <p className="eyebrow">Каталог</p>
              <h2 id="labs-title">Лабораторные работы</h2>
            </div>
            <p className="result-count" aria-live="polite">Показано: {visibleLabs.length} из {labs.length}</p>
          </div>

          <div className="filters" role="search">
            <label className="search-box">
              <Search aria-hidden="true" size={19} />
              <span className="sr-only">Поиск по лабораторным работам</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Номер, тема или практический результат" />
            </label>
            <fieldset className="semester-filter">
              <legend className="sr-only">Фильтр по семестру</legend>
              {['all', ...courseConfig.semesters.map(String)].map((value) => (
                <button key={value} type="button" className={semester === value ? 'active' : ''} onClick={() => setSemester(value)} aria-pressed={semester === value}>
                  {value === 'all' ? 'Все' : `${value} семестр`}
                </button>
              ))}
            </fieldset>
            {preferences.materials?<a className="button secondary" href={preferences.materials} target="_blank" rel="noreferrer"><BookOpen size={18}/>Материалы<ExternalLink size={16}/></a>:<button className="button secondary" onClick={preferences.openSettings}><BookOpen size={18}/>Добавить ссылку на материалы</button>}
          </div>

          {visibleLabs.length ? (
            <div className="lab-grid">
              {visibleLabs.map((lab) => <LabCard key={lab.number} lab={lab} area={subjectArea} profile={profile} />)}
            </div>
          ) : (
            <div className="empty-state">
              <Search aria-hidden="true" />
              <h3>Ничего не найдено</h3>
              <p>Измените поисковый запрос или сбросьте фильтры.</p>
              <button type="button" className="button secondary" onClick={() => { setQuery(''); setSemester('all') }}>Сбросить фильтры</button>
            </div>
          )}
        </section>

        <LmsRules />
      </main>

    </div>
  )
}

function BlockCard({ block, title, semester, count, points, icon }: { block: number; title: string; semester: number; count: number; points: number; icon: React.ReactNode }) {
  return (
    <article className={`block-card block-${block}`}>
      <div className="block-icon">{icon}</div>
      <p className="eyebrow">Блок {block} · {semester} семестр</p>
      <h3>{title}</h3>
      <div className="block-stats">
        <span><strong>{count}</strong> работ</span>
        <span><strong>{points}</strong> баллов</span>
      </div>
      <button type="button" className="text-link" onClick={() => {
        const control = document.querySelector<HTMLButtonElement>(`.semester-filter button:nth-of-type(${courseConfig.semesters.indexOf(semester)+2})`)
        control?.click()
        document.getElementById('labs')?.scrollIntoView({ behavior: 'smooth' })
      }}>Показать работы <ChevronRight aria-hidden="true" size={17} /></button>
    </article>
  )
}

function LabCard({ lab,area,profile }: { lab: Lab;area:SubjectArea;profile:QualityProfile }) {
  return (
    <article className="lab-card">
      <div className="lab-card-top">
        <span className="lab-number">{courseConfig.code}-ЛР{lab.slug}</span>
        <span className="lab-meta"><span className="semester-pill">{lab.semester} семестр</span><span>{lab.points} {pluralizePoints(lab.points)}</span></span>
      </div>
      <p className="topic-line">Тема {lab.topicCode} · {lab.topicTitle}</p>
      <h3>{lab.title}</h3>
      <div className="result-preview">
        <p><strong>Результат</strong>{lab.practicalResult}</p>
      </div>
      <div className="lab-card-actions">
        <a className="button primary" href={`#/lab/${lab.slug}`}>Открыть работу <ArrowRight aria-hidden="true" size={17} /></a>
        <DownloadButton labs={[lab]} area={area} profile={profile} compact/>
      </div>
    </article>
  )
}

function LmsRules() {
  const steps = [
    'Скачайте архив лабораторной работы для своего варианта и откройте шаблон Word.',
    'Выполните задание по выданным исходным данным.',
    'Заполните отчёт и удалите все серые подсказки.',
    'Сохраните результат одним файлом .docx с рекомендуемым именем.',
    'Откройте соответствующее задание лабораторной работы в LMS.',
    'Прикрепите подготовленный файл к заданию в LMS.',
    'Откройте отправку и убедитесь, что файл действительно прикреплён.',
  ]
  return (
    <section className="lms-section" id="lms" aria-labelledby="lms-title">
      <div>
        <p className="eyebrow">Единственное место сдачи</p>
        <h2 id="lms-title">Один отчёт — одна отправка в LMS</h2>
        <p>Сайт не принимает файлы и не проверяет ответы. Итоговый материал каждой работы — один документ Word.</p>
        {courseConfig.lmsUrl&&<a className="button primary" href={courseConfig.lmsUrl} target="_blank" rel="noreferrer">
          Открыть LMS <ExternalLink aria-hidden="true" size={17} />
        </a>}
      </div>
      <ol>{steps.map((step) => <li key={step}>{step}</li>)}</ol>
    </section>
  )
}

function LabPage({ lab, subjectArea, profile, onSubjectAreaChange }: { lab: Lab; subjectArea: SubjectArea; profile: QualityProfile; onSubjectAreaChange: (id: number) => void }) {
  const [packageStatus, setPackageStatus] = useState<'idle' | 'preparing' | 'error'>('idle')
  const previous = labs.find((item) => item.number === lab.number - 1)
  const next = labs.find((item) => item.number === lab.number + 1)
  const reportUrl = `${import.meta.env.BASE_URL}reports/${lab.reportFile}`
  const labText = (value: string) => personalizeText(value, lab.number, subjectArea)
  lab = resolveLab(lab,subjectArea)
  const methodology = {sequence:{previous:lab.previousResults,next:lab.sequenceOutput},example:{title:'Пример на отдельных учебных данных',...lab.workedExample,method:[lab.workedExample.method],boundary:lab.workedExample.check},steps:lab.taskSteps.map(s=>({data:labText(s.sources),result:labText(s.result),check:labText(s.check)}))}
  const preparePackage = async () => {setPackageStatus('preparing');try{await bundle([lab],subjectArea,profile);setPackageStatus('idle')}catch{setPackageStatus('error')}}

  return (
    <div className="lab-shell">
      <main id="main-content" tabIndex={-1}>
        <section className="lab-hero" aria-labelledby="lab-title">
          <div className="lab-hero-inner">
            <nav className="lab-breadcrumb" aria-label="Навигация по курсу">
              <a href="#/"><ArrowLeft aria-hidden="true" size={17} /> Каталог</a>
              <span aria-hidden="true">/</span>
              <span>{courseConfig.code}_ЛР{lab.slug}</span>
            </nav>
            <div className="lab-hero-grid">
              <div className="lab-hero-copy">
                <p className="lab-eyebrow"><span className="semester-pill">{lab.semester} семестр</span><span>Лабораторная работа {lab.semesterLabNumber}</span></p>
                <h1 id="lab-title">{lab.title}</h1>
                <div className="lab-result-line">
                  <span>Результат работы</span>
                  <p>{lab.practicalResult}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="lab-page-grid">
          <article className="lab-content">
            <SubjectAreaPicker value={subjectArea} profile={profile} onChange={onSubjectAreaChange} compact />

            <ContentSection id="situation" number="01" label="Контекст" title="Описание предметной области" icon={<Database aria-hidden="true" />}>
              <div className="lead-card"><p>{subjectArea.code} · {subjectArea.title}. {subjectArea.description}</p><p>{labText(lab.situation)}</p></div>
              <div className="choice-callout"><strong>Профессиональный выбор</strong><p>{labText(lab.professionalChoice)}</p></div>
            </ContentSection>

            <ContentSection id="goal" number="02" label="Результат обучения" title="Цель и формируемые умения" icon={<Target aria-hidden="true" />}>
              <p><strong>Цель.</strong> {labText(lab.goal)}</p>
              <h3>После выполнения вы сможете</h3>
              <Checklist items={lab.outcomes.map(labText)} />
            </ContentSection>

            <ContentSection id="sequence" number="03" label="Связь работ" title="Место работы в последовательности" icon={<ArrowRight aria-hidden="true" />}>
              <div className="sequence-grid">
                <article><span>Результат этой лабораторной работы</span><p>{labText(lab.practicalResult)}</p></article>
                <article><span>Данные для следующей работы</span><p>{methodology.sequence.next}</p></article>
              </div>
              <p className="continuity-note"><strong>Сохраните полученные результаты:</strong> они пригодятся в следующих работах этого варианта. {methodology.sequence.previous}</p><h3>Материалы текущей работы</h3>
              <Checklist items={[
                `Архив ЛР ${lab.slug}, вариант ${subjectArea.code}: задание, шаблон для заполнения и данные только этой работы`,
                `таблицы, правила, ограничения и идентификаторы из раздела «Пояснение к задаче по предметной области»`,
                `редактируемый шаблон ${lab.reportFile}`,
              ]} />
            </ContentSection>

            <ContentSection id="inputs" number="04" label="Стартовый пакет" title="Пояснение к задаче по предметной области" icon={<Layers3 aria-hidden="true" />}>
              <div className="variant-source-note"><strong>Набор {subjectArea.code}</strong><p>На странице и в ZIP-пакете показаны данные только для «{subjectArea.title}». Системный код: <code>{subjectArea.systemCode}</code>.</p><DownloadButton labs={[lab]} area={subjectArea} profile={profile}/></div>
              <p>{labText(lab.sourceData.intro)}</p>
              {lab.sourceData.sections.map((section) => (
                <div className="data-section" key={section.title}>
                  <h3>{labText(section.title)}</h3>
                  {section.content?.map((item, index) => item.includes('\n')
                    ? <pre className="source-block" key={`${section.title}-${index}`}><code>{labText(item)}</code></pre>
                    : <p key={`${section.title}-${index}`}>{labText(item)}</p>)}
                  {section.table && <ResponsiveTable data={{
                    ...section.table,
                    title: section.table.title ? labText(section.table.title) : undefined,
                    columns: section.table.columns.map(labText),
                    rows: section.table.rows.map((row) => row.map((cell) => typeof cell === 'string' ? labText(cell) : cell)),
                  }} />}
                </div>
              ))}
              <h3>Инструменты и допустимая среда</h3><Checklist items={lab.tools.map(labText)} compact />
            </ContentSection>

            <ContentSection id="theory" number="05" label="Теория" title="Памятка для задачи" icon={<BookOpen aria-hidden="true" />}>
              <p>{lab.lectureContext}</p><p>Терминология ITIL 4 используется как учебная опора. Правила и пороги сценария заданы в условии этой работы.</p><div className="theory-grid">{lab.theoryCards.map((card) => (
                <article className="theory-card" key={`${card.label}-${card.title}`}>
                  <span>{labText(card.label)}</span><h3>{labText(card.title)}</h3><p>{labText(card.text)}</p>
                </article>
              ))}</div>
            </ContentSection>

            <ContentSection id="example" number="06" label="Разобранный пример" title={methodology.example.title} icon={<BookOpen aria-hidden="true" />}>
              <div className="worked-example">
                <p><strong>Условие.</strong> {methodology.example.source}</p>
                <h3>Ход решения</h3>
                <Checklist items={methodology.example.method} numbered />
                <p><strong>Проверяемый результат.</strong> {methodology.example.result}</p>
                <p className="example-boundary"><strong>Граница примера.</strong> {methodology.example.boundary}</p>
              </div>
            </ContentSection>

            <ContentSection id="profile" number="07" label="Ваш вариант" title="Условия вашего варианта" icon={<ShieldCheck aria-hidden="true" />}>
              <p className="profile-intro">Для варианта {subjectArea.code} используйте значения ниже. Они определяют условия выполнения задания.</p>
              <div className="characteristic-grid">{profile.characteristics.map((item) => (
                <article className="characteristic-card" key={item.code}>
                  <span>{item.code}</span><h3>{item.name}</h3><strong>{item.value}</strong><p>{item.example.replaceAll('{system}', subjectArea.title)}</p>
                </article>
              ))}</div>
            </ContentSection>

            <ContentSection id="task" number="08" label="Задание" title="Последовательность действий" icon={<ListChecks aria-hidden="true" />}>
              <p className="task-scope"><strong>Все действия обязательны.</strong> Дополнительное задание ниже необязательно и не увеличивает максимальный балл.</p>
              <TaskProtocol actions={lab.taskSteps.map(s=>labText(s.action))} guides={methodology.steps} subjectArea={subjectArea} />
              <details><summary>Дополнительное задание</summary><p>{labText(lab.optionalTask.action)}</p><p>{labText(lab.optionalTask.result)}</p><p>{labText(lab.optionalTask.check)}</p></details>
              <h3>Как оценивается результат</h3><p>{lab.assessment}</p>
            </ContentSection>

            <ContentSection id="self-check" number="09" label="Перед отправкой" title="Самопроверка" icon={<ClipboardCheck aria-hidden="true" />}>
              <Checklist items={lab.deliverables.map(x=>`Готово: ${labText(x)}`)} checkboxes />

            </ContentSection>

            <ContentSection id="lms-submit" number="10" label="Отчёт и LMS" title="Требования к отчёту и сдаче" icon={<GraduationCap aria-hidden="true" />}>
              <p><strong>Один заполненный редактируемый DOCX-файл.</strong></p><h3>Требования к Word-файлу</h3><Checklist items={lab.wordRequirements.map(labText)} />
              <p className="filename"><strong>Рекомендуемое имя:</strong> <code>{lab.recommendedFileName}</code></p>
              <ol className="lms-steps">{lab.lmsSteps.map((step) => <li key={step}>{step}</li>)}</ol>
              <div className="submission-actions">
                <a className="button primary" href={reportUrl} download><Download aria-hidden="true" size={18} /> Скачать редактируемый DOCX</a>
                {courseConfig.lmsUrl&&<a className="button secondary" href={courseConfig.lmsUrl} target="_blank" rel="noreferrer">Перейти в LMS <ExternalLink aria-hidden="true" size={17} /></a>}
              </div>
            </ContentSection>

            <nav className="lab-pager" aria-label="Соседние лабораторные работы">
              {previous ? <a href={`#/lab/${previous.slug}`}><ArrowLeft aria-hidden="true" /> <span><small>Предыдущая</small>ЛР {previous.slug}</span></a> : <span />}
              {next ? <a href={`#/lab/${next.slug}`}><span><small>Следующая</small>ЛР {next.slug}</span> <ArrowRight aria-hidden="true" /></a> : <span />}
            </nav>
          </article>

          <aside className="lab-summary" aria-label="Краткая карточка работы">
            <p className="eyebrow">Карточка работы</p>
            <dl>
              <div><dt>ID</dt><dd>{courseConfig.code}-ЛР{lab.slug}</dd></div>
              <div><dt>Результат</dt><dd>{lab.practicalResult}</dd></div>
              <div><dt>Учебный блок</dt><dd>{lab.blockTitle}</dd></div>
            </dl>
            <div className="summary-actions" aria-label="Шаблон работы">
              <button className="button primary" type="button" disabled={packageStatus === 'preparing'} onClick={preparePackage}>
                <Download aria-hidden="true" size={18} /> {packageStatus === 'preparing' ? 'Подготовка…' : packageStatus === 'error' ? 'Повторить скачивание' : 'Скачать лабораторную работу'}
              </button>
            </div>
            {packageStatus === 'error' && <p className="package-error" role="status">Не удалось подготовить комплект. Проверьте соединение и повторите скачивание.</p>}
            <a className="summary-link" href="#/"><HomeIcon aria-hidden="true" size={15} /> Ко всем работам</a>
          </aside>
        </div>
      </main>
    </div>
  )
}

function TaskProtocol({ actions, guides, subjectArea }: { actions: string[]; guides: StepGuide[]; subjectArea: SubjectArea }) {
  return (
    <ol className="task-protocol">
      {actions.map((action, index) => {
        const guide = guides[index]
        return (
          <li key={action}>
            <h3>{action}</h3>
            <dl>
              <div><dt>С чем работать</dt><dd>Набор {subjectArea.code}. {guide.data}</dd></div>
              <div><dt>Результат шага</dt><dd>{guide.result}</dd></div>
              <div><dt>Проверка</dt><dd>{guide.check}</dd></div>
            </dl>
          </li>
        )
      })}
    </ol>
  )
}

function SubjectAreaPicker({ value, profile, onChange, compact = false }: { value: SubjectArea; profile: QualityProfile; onChange: (id: number) => void; compact?: boolean }) {
  const titleId = compact ? 'variant-title-lab' : 'variant-title'
  return (
    <section className={`variant-picker${compact ? ' compact' : ''}`} id={compact ? undefined : 'variants'} aria-labelledby={titleId}>
      <div className="variant-picker-copy">
        <p className="eyebrow">Один вариант для всех работ · {subjectAreas.length} вариантов</p>
        <h2 id={titleId}>{value.code} · {value.title}</h2>
        <p>Одна предметная область используется во всех {labs.length} работах. Номер области совпадает с номером варианта.</p>
      </div>
      <label className="variant-select"><span>Предметная область</span><select value={value.id} onChange={(event) => onChange(Number(event.target.value))}>{subjectAreas.map((area) => <option key={area.code} value={area.id}>{area.code} · {area.title}</option>)}</select></label>
      <dl className="variant-facts">
        <div><dt>Система</dt><dd><code>{value.systemCode}</code></dd></div>
        <div><dt>Группа</dt><dd>{profile.variantRange} · {profile.title}</dd></div>
        <div><dt>Критичная функция</dt><dd>{value.criticalFunction}</dd></div>
      </dl>

    </section>
  )
}

function ContentSection({ id, number, label, title, icon, children }: { id: string; number: string; label: string; title: string; icon: React.ReactNode; children: React.ReactNode }) {
  const titleClassName = title.length > 24 ? 'content-section-title is-long' : 'content-section-title'
  return <section className="content-section" id={id}><header className="content-section-heading"><span className="section-icon">{icon}</span><div><p className="eyebrow">{number} · {label}</p><h2 className={titleClassName}>{title}</h2></div></header><div className="content-section-body">{children}</div></section>
}

function Checklist({ items, compact = false, numbered = false, checkboxes = false }: { items: string[]; compact?: boolean; numbered?: boolean; checkboxes?: boolean }) {
  const Tag = numbered ? 'ol' : 'ul'
  return <Tag className={`checklist ${compact ? 'compact' : ''} ${checkboxes ? 'with-boxes' : ''}`}>{items.map((item) => <li key={item}>{!numbered && !checkboxes && <CheckCircle2 aria-hidden="true" size={18} />}{checkboxes?<label><input type="checkbox"/>{item}</label>:item}</li>)}</Tag>
}

function ResponsiveTable({ data }: { data: DataTable }) {
  return <figure className="data-table"><div className="table-scroll"><table><thead><tr>{data.columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{data.rows.map((row, rowIndex) => <tr key={`${rowIndex}-${row.join('-')}`}>{row.map((cell, cellIndex) => <td key={`${cellIndex}-${cell}`}>{cell}</td>)}</tr>)}</tbody></table></div>{data.title && <figcaption>{data.title}</figcaption>}</figure>
}

function NotFound() {
  return <main id="main-content" className="not-found" tabIndex={-1}><FileText aria-hidden="true" size={48} /><h1>Работа не найдена</h1><p>Проверьте номер в ссылке или вернитесь в каталог.</p><a className="button primary" href="#/">Открыть каталог</a></main>
}

function pluralizePoints(points: number) {
  if (points === 1) return 'балл'
  if (points >= 2 && points <= 4) return 'балла'
  return 'баллов'
}

async function bundle(selected:Lab[],area:SubjectArea,profile:QualityProfile){const [{downloadBundle},{renderToStaticMarkup}]=await Promise.all([import('./lib/labPackage'),import('react-dom/server')]);return downloadBundle({labs:selected.map(l=>resolveLab(l,area)),area,profile,renderPage:lab=>renderToStaticMarkup(<LabPage lab={lab} subjectArea={area} profile={profile} onSubjectAreaChange={()=>{}} />)})}
function DownloadButton({labs:selected,area,profile,compact=false,all=false}:{labs:Lab[];area:SubjectArea;profile:QualityProfile;compact?:boolean;all?:boolean}){const [busy,setBusy]=useState(false);const [error,setError]=useState('');return <><button className={compact?'card-download':all?'button secondary':'button primary'} disabled={busy} aria-label={compact?`Скачать лабораторную работу ЛР ${selected[0].slug}`:undefined} onClick={async()=>{setBusy(true);setError('');try{await bundle(selected,area,profile)}catch{setError('Не удалось подготовить архив. Повторите скачивание.')}finally{setBusy(false)}}}><Download size={18}/>{compact?'':busy?'Готовим архив…':all?'Комплект всех работ для варианта':'Скачать лабораторную работу'}</button>{error&&<p role="alert">{error}</p>}</>}
export function App(){return <PreferencesProvider><CourseApp/></PreferencesProvider>}
