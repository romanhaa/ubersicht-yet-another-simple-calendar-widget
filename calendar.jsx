// based on: https://github.com/knazarov/ubersicht-calendar-widget
// requires ical-buddy: brew install ical-buddy

// --------------- CUSTOMIZE ME ---------------
// the following dimensions are specified in pixels
const WIDTH = 250 // width of the widget
const TOP = 400 // top margin
const LEFT = 24 // left margin
const BOTTOM = 24 // bottom margin
const REFRESH_FREQUENCY = 60 // widget refresh frequency in seconds
// --------------------------------------------

const line_regex = /^(\d+-\d+-\d+)?(?: at )?(\d+:\d+) - (\d+-\d+-\d+)?(?: at )?((?:\d+:\d+)|(?:\.\.\.))([^]*)?([^]*)?([^]*)?$/
const zoom_link_regex = /(https:\/\/[a-z]{2,20}.zoom.[a-z]{2,3}\/j\/[^ >]*)/
const gmeet_link_regex = /(https:\/\/meet\.google\.com\/[^ >]*)/
const teams_link_regex = /(https:\/\/teams\.microsoft\.com\/l\/meetup-join\/[^ >]*)/

// construct bash command to grab today's events
// Refer to https://hasseg.org/icalBuddy/man.html
const executablePath = "/usr/local/bin/icalBuddy "
// baseCommand = " eventsFrom:yesterday to:yesterday"
const baseCommand = " eventsToday"
const options = "-ea -npn -nrd -nc -b '' -nnr ' ' -iep 'title,datetime,location,notes' -ps '||' -po 'datetime,title,location,notes' -tf '%H:%M' -df '%Y-%m-%d'"
export const command = executablePath + options + baseCommand

// refresh frequency in milliseconds
export const refreshFrequency = REFRESH_FREQUENCY * 1000;

export const className = `
    top: ${TOP}px;
    left: ${LEFT}px;
    bottom: ${BOTTOM}px;
    width: ${WIDTH}px;
    color: #FFFFFF;
    font-family: Helvetica;
    border-width: 2px;
    overflow: hidden;
    z-index: 0;
`

function processEvents(current_time, output) {
    const lines = output.split('\n').filter(item => item)
    const events = []
    lines.forEach(line => {
        const result = line_regex.exec(line)
        events.push({
            'start_time_str': result[2].replace(/^0+/, ""),
            'start_time': convertStrTimeToDecimal(result[2]),
            'end_time_str': result[4].replace(/^0+/, ""),
            'end_time': convertStrTimeToDecimal(result[4]),
            'title': result[5],
            'zoom_link': getLink(result[6] + " " + result[7], zoom_link_regex),
            'gmeet_link': getLink(result[6] + " " + result[7], gmeet_link_regex),
            'teams_link': getLink(result[6] + " " + result[7], teams_link_regex),
        })
    })
    return events
}

function convertStrTimeToDecimal(str) {
    const result = str.split(":")
    return parseInt(result[0]) + parseInt(result[1])/60
}

function getLink(str, regex) {
    const links = regex.exec(str)
    if (Array.isArray(links) && links.length > 1) {
        return [...new Set(links)]
    } else {
        return ""
    }
}

const Header = ({date}) => {
    const month_names = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ]
    return (
        <div id="date" style={{fontWeight: "bold", marginBottom: "5px"}}>
            {`${date.getDate()}. ${month_names[date.getMonth()]} ${date.getFullYear()}`}
        </div>
    )
}

const Events = ({date, output}) => {
    const current_time = date.getHours() + date.getMinutes() / 60
    const events = processEvents(current_time, output)
    return (
        <div id="events">
            {
                events.length > 0 ? (
                    events
                    .sort((a, b) => a.start_time - b.start_time || a.end_time - b.end_time)
                    .map(event => {
                        return <Event event={event} current_time={current_time} />
                    })
                ) : <span style={{fontSize: "12px"}}>No events today.</span>
            }
        </div>
    )
}

const Event = ({event, current_time}) => {
    const border_thickness = (event.start_time <= current_time && event.end_time >= current_time) ? 8 : 4
    const color = (current_time >= event.end_time) ? "#808080" : (
            current_time - event.start_time >= -0.5 &&
            current_time <= event.end_time
        ) ? "#e74c3c" : "#FFFFFF"
    return (
        <div
            id={event.title}
            style={{
                fontWeight: "bold",
                fontSize: "12px",
                borderLeft: "solid 4px",
                borderRadius: "2px",
                paddingTop: "4px",
                paddingBottom: "4px",
                paddingLeft: "5px",
                mixBlendMode: "multiply",
                color: `${color}`,
                overflow: "hidden",
                marginBottom: "5px",
                width: `${WIDTH-5}px`,
                left: "0px",
                borderLeft: `solid ${border_thickness}px`,
            }}
        >
            {`${event.start_time_str} - ${event.end_time_str}`}
            <Link label="zoom" values={event.zoom_link} color={color} />
            <Link label="gmeet" values={event.gmeet_link} color={color} />
            <Link label="teams" values={event.teams_link} color={color} />
            <br/>
            {event.title}
        </div>
    )
}

const Link = ({label, values, color}) => (
    values === "" ? null :
        values.map(value => (
            <a class="meeting-link" href={value} style={{
                marginLeft: "5px",
                color: `${color}`,
            }}>
                [{label}]
            </a>
        ))
)

export const render = ({ output }) => {
    const today = new Date()
    return (
        <div id="calendar-widget">
            <Header date={today} />
            <Events date={today} output={output} />
        </div>
    )
}
