
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
  SearchIcon,
  Tag,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useMediaQuery } from "@/hooks/use-media-query"
import { Card, CardContent, CardHeader, CardTitle } from "./card"

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

export function FullScreenCalendar({ data, onNewEvent, renderEventActions, renderEventBadge }: FullScreenCalendarProps) {
  const today = startOfToday()
  const [selectedDay, setSelectedDay] = React.useState(today)
  const [currentMonth, setCurrentMonth] = React.useState(
    format(today, "MMM-yyyy"),
  )
  const firstDayCurrentMonth = parse(currentMonth, "MMM-yyyy", new Date())
  const isDesktop = useMediaQuery("(min-width: 1024px)")

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
    <div className="flex flex-col lg:flex-row flex-1 h-[85vh] bg-card rounded-2xl shadow-lg shadow-primary/5 border-border/20">
      <div className="flex-1">
        {/* Calendar Header */}
        <div className="flex flex-col space-y-4 p-4 md:flex-row md:items-center md:justify-between md:space-y-0 lg:flex-none">
          <div className="flex flex-auto">
            <div className="flex items-center gap-4">
              <div className="hidden w-20 flex-col items-center justify-center rounded-lg border bg-muted p-0.5 md:flex">
                <h1 className="p-1 text-xs uppercase text-muted-foreground">
                  {format(today, "MMM", { locale: ptBR })}
                </h1>
                <div className="flex w-full items-center justify-center rounded-lg border bg-background p-0.5 text-lg font-bold">
                  <span>{format(today, "d", { locale: ptBR })}</span>
                </div>
              </div>
              <div className="flex flex-col">
                <h2 className="text-lg font-semibold text-foreground">
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
        <div className="lg:flex lg:flex-auto lg:flex-col">
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

          {/* Calendar Days */}
          <div className="flex text-xs leading-6 lg:flex-auto">
            <div className="hidden w-full border-r lg:grid lg:grid-cols-7 lg:grid-rows-6">
              {days.map((day, dayIdx) => (
                <div
                  key={dayIdx}
                  onClick={() => setSelectedDay(day)}
                  className={cn(
                    dayIdx === 0 && colStartClasses[getDay(day)],
                    !isEqual(day, selectedDay) &&
                      !isSameMonth(day, firstDayCurrentMonth) &&
                      "bg-muted/30",
                    "relative flex flex-col border-b border-r hover:bg-muted focus:z-10 cursor-pointer",
                    !isEqual(day, selectedDay) && "hover:bg-accent/75",
                  )}
                >
                  <header className="flex items-center justify-end p-2.5">
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
                  <div className="flex-1 p-1">
                    {data
                      .filter((event) => isSameDay(event.day, day))
                      .map((day) => (
                        <div key={day.day.toString()} className="space-y-1.5">
                          {day.events.slice(0, isDesktop ? 2 : 1).map((event) => (
                            <div
                              key={event.id}
                              className="flex items-center gap-1 rounded p-1 text-xs leading-tight bg-primary/10 text-primary-foreground"
                            >
                               <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0"></div>
                               <p className="font-medium leading-none truncate text-primary">{event.name}</p>
                            </div>
                          ))}
                          {day.events.length > (isDesktop ? 2 : 1) && (
                            <div className="text-xs text-muted-foreground">
                              + {day.events.length - (isDesktop ? 2 : 1)} mais
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Mobile View */}
            <div className="isolate grid w-full grid-cols-7 grid-rows-6 lg:hidden">
              {days.map((day, dayIdx) => (
                <button
                  onClick={() => setSelectedDay(day)}
                  key={dayIdx}
                  type="button"
                  className={cn(
                    "flex h-14 flex-col border-b border-r p-1.5 hover:bg-muted focus:z-10",
                    isSameMonth(day, firstDayCurrentMonth) ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  <time
                    dateTime={format(day, "yyyy-MM-dd")}
                    className={cn(
                      "ml-auto flex size-6 items-center justify-center rounded-full",
                      isEqual(day, selectedDay) && "bg-primary text-primary-foreground font-semibold",
                      isToday(day) && !isEqual(day, selectedDay) && "bg-accent text-accent-foreground font-semibold",
                    )}
                  >
                    {format(day, "d")}
                  </time>
                  {data.filter((date) => isSameDay(date.day, day)).length > 0 && (
                    <div className="-mx-0.5 mt-auto flex flex-wrap-reverse justify-center">
                      {data.filter((date) => isSameDay(date.day, day))[0].events.map((event) => (
                          <span key={event.id} className="mx-0.5 mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Selected Day's Events */}
      <aside className="w-full lg:w-96 lg:border-l p-4 space-y-4">
        <h3 className="font-headline text-xl text-center sm:text-left">
          Posts para {format(selectedDay, "dd 'de' MMMM", { locale: ptBR })}
        </h3>
        {selectedDayEvents.length > 0 ? (
          <div className="space-y-4 text-left">
            {selectedDayEvents.map((event) => (
              <div key={event.id} className="p-4 rounded-lg border bg-background/50 flex items-start justify-between gap-4">
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
                  {renderEventActions && renderEventActions(event)}
                 </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 px-4 rounded-xl bg-muted/50 border border-dashed h-full flex flex-col justify-center">
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
