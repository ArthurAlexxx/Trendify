
"use client"

import * as React from "react"
import {
  add,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  getDay,
  isEqual,
  isSameDay,
  isSameMonth,
  isToday,
  parse,
  startOfToday,
  startOfWeek,
} from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  CalendarIcon,
  Tag
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

interface Event {
  id: string | number
  name: string
  time: string
  datetime: string
  status: 'Agendado' | 'Publicado' | 'Rascunho'
  contentType: 'Reels' | 'Story' | 'Post';
  notes?: string;
}

interface CalendarData {
  day: Date
  events: Event[]
}

interface FullScreenCalendarProps {
  data: CalendarData[]
  onNewEvent: (date: Date) => void
  onEventClick?: (event: Event) => void;
  renderEventActions?: (event: Event) => React.ReactNode;
  renderEventBadge?: (event: Event) => React.ReactNode;
}

const colStartClasses = [
  "",
  "col-start-2",
  "col-start-3",
  "col-start-4",
  "col-start-5",
  "col-start-6",
  "col-start-7",
]

export function FullScreenCalendar({ data, onNewEvent, onEventClick, renderEventActions, renderEventBadge }: FullScreenCalendarProps) {
  const today = startOfToday()
  const [selectedDay, setSelectedDay] = React.useState(today)
  const [currentMonth, setCurrentMonth] = React.useState(
    format(today, "MMM-yyyy"),
  )
  const firstDayCurrentMonth = parse(currentMonth, "MMM-yyyy", new Date())

  const days = eachDayOfInterval({
    start: startOfWeek(firstDayCurrentMonth, { locale: ptBR }),
    end: endOfWeek(endOfMonth(firstDayCurrentMonth), { locale: ptBR }),
  })

  function previousMonth() {
    const firstDayNextMonth = add(firstDayCurrentMonth, { months: -1 })
    setCurrentMonth(format(firstDayNextMonth, "MMM-yyyy"))
  }
  
  function nextMonth() {
    const firstDayNextMonth = add(firstDayCurrentMonth, { months: 1 })
    setCurrentMonth(format(firstDayNextMonth, "MMM-yyyy"))
  }
  
  function goToToday() {
    setCurrentMonth(format(today, "MMM-yyyy"))
    setSelectedDay(today)
  }

  const selectedDayEvents = React.useMemo(() => {
    return data.find((d) => isSameDay(d.day, selectedDay))?.events ?? []
  }, [data, selectedDay])


  return (
    <div className="flex flex-col flex-1 min-h-[85vh] bg-card rounded-2xl shadow-lg shadow-primary/5 border-border/20 lg:flex-row">
      <div className="flex-1 lg:flex lg:flex-auto lg:flex-col">
        {/* Calendar Header */}
        <div className="flex flex-col space-y-4 p-4 md:flex-row md:items-center md:justify-between md:space-y-0 lg:flex-none">
          <div className="flex flex-auto">
            <div className="flex items-center gap-4">
              <div className="hidden w-20 flex-col items-center justify-center rounded-lg border bg-muted p-0.5 md:flex">
                <h1 className="p-1 text-xs uppercase text-muted-foreground">
                  {format(firstDayCurrentMonth, "MMM", { locale: ptBR })}
                </h1>
                <div className="flex w-full items-center justify-center rounded-lg border bg-background p-0.5 text-lg font-bold">
                  <span>{format(firstDayCurrentMonth, "d")}</span>
                </div>
              </div>
              <div className="flex flex-col">
                <h2 className="text-lg font-semibold text-foreground capitalize">
                  {format(firstDayCurrentMonth, "MMMM, yyyy", { locale: ptBR })}
                </h2>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-4 md:flex-row md:gap-6">
            <div className="inline-flex w-full -space-x-px rounded-lg shadow-sm shadow-black/5 md:w-auto rtl:space-x-reverse">
              <Button
                onClick={previousMonth}
                className="rounded-none shadow-none first:rounded-s-lg last:rounded-e-lg focus-visible:z-10"
                variant="outline"
                size="icon"
                aria-label="Navigate to previous month"
              >
                <ChevronLeft size={16} strokeWidth={2} aria-hidden="true" />
              </Button>
              <Button
                onClick={goToToday}
                className="w-full rounded-none shadow-none first:rounded-s-lg last:rounded-e-lg focus-visible:z-10 md:w-auto"
                variant="outline"
              >
                Hoje
              </Button>
              <Button
                onClick={nextMonth}
                className="rounded-none shadow-none first:rounded-s-lg last:rounded-e-lg focus-visible:z-10"
                variant="outline"
                size="icon"
                aria-label="Navigate to next month"
              >
                <ChevronRight size={16} strokeWidth={2} aria-hidden="true" />
              </Button>
            </div>

            <Separator
              orientation="horizontal"
              className="block w-full md:hidden"
            />

            <Button onClick={() => onNewEvent(selectedDay)} className="w-full gap-2 md:w-auto">
              <PlusCircle size={16} strokeWidth={2} aria-hidden="true" />
              <span>Agendar Post</span>
            </Button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="flex flex-auto flex-col">
          {/* Week Days Header */}
          <div className="grid grid-cols-7 border-t text-center text-xs font-semibold leading-6 lg:flex-none">
            <div className="border-r py-2.5">Dom</div>
            <div className="border-r py-2.5">Seg</div>
            <div className="border-r py-2.5">Ter</div>
            <div className="border-r py-2.5">Qua</div>
            <div className="border-r py-2.5">Qui</div>
            <div className="border-r py-2.5">Sex</div>
            <div className="py-2.5">Sáb</div>
          </div>

          <div className="grid grid-cols-7 grid-rows-6 lg:flex-auto bg-muted/30 text-xs leading-6">
              {days.map((day, dayIdx) => {
                const dayEvents = data.find((d) => isSameDay(d.day, day))?.events ?? [];
                return (
                <div
                  key={dayIdx}
                  onClick={() => setSelectedDay(day)}
                  className={cn(
                    dayIdx === 0 && colStartClasses[getDay(day)],
                    !isSameMonth(day, firstDayCurrentMonth) && "bg-muted/30 text-muted-foreground",
                    isSameMonth(day, firstDayCurrentMonth) && "bg-background",
                    "relative flex flex-col border-b border-r p-1 hover:bg-muted focus:z-10 cursor-pointer min-h-[100px]"
                  )}
                >
                  <header className="flex items-center justify-end p-1">
                    <button
                      type="button"
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-full text-xs",
                        isToday(day) && "bg-primary text-primary-foreground font-semibold",
                        isEqual(day, selectedDay) && "ring-2 ring-primary ring-offset-2",
                         !isToday(day) && !isEqual(day, selectedDay) && "hover:bg-accent"
                      )}
                    >
                      <time dateTime={format(day, "yyyy-MM-dd")}>
                        {format(day, "d")}
                      </time>
                    </button>
                  </header>
                  <div className="flex-1 overflow-y-auto space-y-1">
                    {dayEvents.slice(0, 2).map((event) => (
                      <div
                        key={event.id}
                        onClick={(e) => { e.stopPropagation(); onEventClick?.(event); }}
                        className="flex items-center gap-1 rounded p-1 text-xs leading-tight bg-primary/10 text-primary-foreground cursor-pointer hover:bg-primary/20"
                      >
                         <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0"></div>
                         <p className="font-medium leading-none truncate text-primary">{event.name}</p>
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                       <div className="text-xs text-muted-foreground mt-1">
                          + {dayEvents.length - 2} mais
                       </div>
                    )}
                  </div>
                </div>
              )})}
          </div>
        </div>
      </div>
      
      {/* Selected Day's Events */}
      <aside className="w-full lg:w-96 lg:border-l p-4 flex flex-col">
        <h3 className="font-headline text-xl text-center sm:text-left mb-4 capitalize">
          Posts para {format(selectedDay, "dd 'de' MMMM", { locale: ptBR })}
        </h3>
        {selectedDayEvents.length > 0 ? (
          <div className="space-y-4 text-left flex-1">
            {selectedDayEvents.map((event) => (
              <div key={event.id} onClick={() => onEventClick?.(event)} className="p-4 rounded-lg border bg-background/50 flex items-start justify-between gap-4 cursor-pointer hover:bg-muted">
                 <div className="flex items-start gap-4 flex-1 overflow-hidden">
                   <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <Tag className="h-6 w-6 text-muted-foreground" />
                   </div>
                   <div className="flex-1 overflow-hidden">
                      <p className="font-semibold text-foreground truncate">{event.name}</p>
                      <p className="text-sm text-muted-foreground">{event.contentType} • {event.time}</p>
                   </div>
                 </div>
                 <div className='flex items-center gap-2'>
                  {renderEventBadge && renderEventBadge(event)}
                 </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 px-4 rounded-xl bg-muted/50 border border-dashed flex-1 flex flex-col justify-center items-center">
            <CalendarIcon className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
            <h3 className="font-semibold text-foreground">
              Nenhum post para este dia.
            </h3>
            <p className="text-sm text-muted-foreground">
              Clique em "Agendar Post" para adicionar um.
            </p>
          </div>
        )}
      </aside>
    </div>
  )
}
