# based on: https://github.com/knazarov/ubersicht-calendar-widget
# requires ical-buddy: brew install ical-buddy

# --------------- CUSTOMIZE ME ---------------
# the following dimensions are specified in pixels
WIDTH = 250 # width of the widget
TOP = 400 # top margin
LEFT = 24 # left margin
BOTTOM = 24 # bottom margin
GAP = 5 # gap between events
# --------------------------------------------

# construct bash command to grab today's events
# Refer to https://hasseg.org/icalBuddy/man.html
executablePath = "/usr/local/bin/icalBuddy "
baseCommand = " eventsToday"
options = "-ea -npn -nrd -nc -b '' -nnr ' ' -iep 'title,datetime,notes' -ps '||' -po 'datetime,title,notes' -tf '%H:%M' -df '%Y-%m-%d'"
command: executablePath + options + baseCommand

# refresh frequency in milliseconds
refreshFrequency: 60 * 1000

style: """
    top: #{TOP}px
    left: #{LEFT}px
    bottom: #{BOTTOM}px
    width: #{WIDTH}px
    color: #FFFFFF
    font-family: Helvetica
    border-width: 2px;
    overflow: hidden;
    z-index: 0
    div
        display: block
        color white
        font-size: 14px
        font-weight: 450
        text-align left
    #head
        font-weight: bold
        font-size 20px
    .event
        font-weight: bold
        font-size: 12px
        border-left: solid 4px
        border-radius: 2px
        padding-top 6px
        padding-bottom 6px
        padding-left: 5px
        mix-blend-mode: multiply;
        color: #FFFFFF
        overflow: hidden
    .event:hover
        background-color: #a0b8f0
        cursor: pointer
        cursor: hand
    .meeting-link
        color: #FFFFFF
"""

render: (output) -> ""

timeToHhMm: (time) ->
    hh = Math.floor(Math.abs(time))
    mm = Math.floor(((time - hh) * 60) % 60)
    if mm < 10
        mm = "0" + mm
    return hh + ":" + mm

hours: (str) ->
    regex = /(\d+):(\d+)/
    result = regex.exec(str)
    return parseInt(result[1]) + parseInt(result[2])/60

getLink: (str, regex) ->
    link = regex.exec(str)
    if Array.isArray(link) and link.length > 1
        link = link[0]
    else
        link = ""
    return link

formatCurrentDate: (date) ->
    month_names = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ]
    # return ("0" + date.getDate()).slice(-2) + "-" + ("0"+(date.getMonth()+1)).slice(-2) + "-" + date.getFullYear()
    return (date.getDate() + ". " + month_names[date.getMonth()] + " " + date.getFullYear())

afterRender: (domEl) ->
  $(domEl).on 'click', '.event', (e) =>
    link = $(e.currentTarget).attr 'data-link'
    @run "open " + link

update: (output, domEl) ->
    lines = output.split('\n')
    lines = lines.filter (line) -> line isnt ""
    dom = $(domEl)
    dom.empty()
    today = new Date()
    current_time = today.getHours() + today.getMinutes() / 60
    dom.append(@formatCurrentDate(today))
    line_regex = /^(\d+-\d+-\d+)?(?: at )?(\d+:\d+) - (\d+-\d+-\d+)?(?: at )?((?:\d+:\d+)|(?:\.\.\.))([^]*)?([^]*)?$/
    zoom_link_regex = /(https:\/\/.*zoom.*\/j\/[^ ]*)/
    gmeet_link_regex = /(https:\/\/meet\.google\.com\/[^ ]*)/
    events = []
    for line in lines
        result = line_regex.exec(line)
        event =
            start_date: result[1]
            start_time: @hours(result[2])
            end_date: result[3] or result[1]
            end_time: @hours(result[4])
            title: result[5]
            zoom_link: @getLink(result[6], zoom_link_regex)
            gmeet_link: @getLink(result[6], gmeet_link_regex)
        events.push(event)
    start_pos = 10
    for event in events
        if event.start_time <= current_time and event.end_time >= current_time
            border_thickness = 12
        else
            border_thickness = 4
        str = """<div class="event" id="#{event.title}" style="position: absolute; top: #{start_pos+21}px; width: #{WIDTH-5}px; left: 0px; border-left: solid #{border_thickness}px;">
            #{@timeToHhMm(event.start_time)} - #{@timeToHhMm(event.end_time)}"""
        if event.zoom_link != ""
            str += """ <a class="meeting-link" href="#{event.zoom_link}">[zoom]</a>"""
        if event.gmeet_link != ""
            str += """ <a class="meeting-link" href="#{event.gmeet_link}">[gmeet]</a>"""
        str += """<br>#{event.title}</div>"""
        dom.append(str)
        divHeight = document.getElementById(event.title).clientHeight;
        start_pos = start_pos + divHeight + GAP
