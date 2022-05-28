// based on: https://github.com/knazarov/ubersicht-calendar-widget
// requires ical-buddy: brew install ical-buddy

// --------------- CUSTOMIZE ME ---------------
// the following dimensions are specified in pixels
const WIDTH = 250; // width of the widget
const TOP = 550; // top margin
const LEFT = 24; // left margin
const BOTTOM = 24; // bottom margin
const REFRESH_FREQUENCY = 60; // widget refresh frequency in seconds
// --------------------------------------------

import { run } from 'uebersicht';

const line_regex = /^(\d+-\d+-\d+)?(?: at )?(\d+:\d+) - (\d+-\d+-\d+)?(?: at )?((?:\d+:\d+)|(?:\.\.\.))([^]*)?([^]*)?([^]*)?$/;
const zoom_link_regex = /(https:\/\/[a-z]{2,20}.zoom.[a-z]{2,3}\/j\/[^ >]*)/;
const gmeet_link_regex = /(https:\/\/meet\.google\.com\/[^ >]*)/;
const teams_link_regex = /(https:\/\/teams\.microsoft\.com\/l\/meetup-join\/[^ >]*)/;

export function command(dispatch) {
  // console.log("called 'command'");
  getData(dispatch, undefined);
}

function getData(dispatch, offset) {
  if (offset === undefined) {
    const dateElement = document.getElementById('shown-date');
    // console.log({ dateElement });
    offset = dateElement === null ? 0 : parseInt(dateElement.dataset.offset);
  }
  // console.log({ offset });
  const offsetString = offset > 0 ? `+${offset}` : `${offset}`;
  // construct bash command to grab today's events
  // Refer to https://hasseg.org/icalBuddy/man.html
  const commandString = `/usr/local/bin/icalBuddy -ea -npn -nrd -nc -b '' -nnr ' ' -iep 'title,datetime,location,notes' -ps '||' -po 'datetime,title,location,notes' -tf '%H:%M' -df '%Y-%m-%d' eventsFrom:today${offsetString} to:today${offsetString}`;
  // console.log(commandString);
  run(commandString).then((output) =>
    dispatch({ type: 'UB/COMMAND_RAN', output })
  );
}

export const initialState = {
  output: '',
  offset: 0,
};

export function updateState(event, previousState) {
  // console.log("called 'updateState'")
  // console.log({event})
  switch (event.type) {
    case 'UB/COMMAND_RAN':
      // console.log({output: event.output})
      if (typeof event.output !== 'undefined') {
        // console.log("returning 'undefined'")
        return { ...previousState, output: event.output };
      }
    case 'CHANGE_OFFSET':
      // console.log({offset: event.offset})
      if (typeof event.offset !== 'undefined') {
        // console.log("returning 'undefined'")
        return { ...previousState, offset: event.offset };
      }
    case 'LOADING':
      return { ...previousState, output: 'loading' };
    default:
      return { ...previousState };
  }
}

// refresh frequency in milliseconds
export const refreshFrequency = REFRESH_FREQUENCY * 1000;

export const className = `
  top: ${TOP}px;
  left: ${LEFT}px;
  bottom: ${BOTTOM}px;
  width: ${WIDTH}px;
  color: #FFFFFF;
  font-family: Helvetica;
  overflow: hidden;
  z-index: 0;
  .header {
    display: inline-block;
  }
  .dateInHeader {
    font-size: 16px;
    font-weight: bold;
    margin-left: 8px;
    margin-right: 8px;
    margin-bottom: 5px;
  }
  .buttonOffset {
    color: #A9A9A9;
    font-size: 12px;
    user-select: none;
  }
  .buttonOffsetChange {
    margin-bottom: 5px;
  }
  .buttonOffsetReset {
    margin-bottom: 5px;
    margin-left: 5px;
  }
  .event {
    font-size: 12px;
  }
  .event-details {
    font-weight: bold;
    border-left: solid 4px;
    border-radius: 2px;
    padding-top: 4px;
    padding-bottom: 4px;
    padding-left: 5px;
    mix-blend-mode: multiply;
    overflow: hidden;
    margin-bottom: 5px;
    width: ${WIDTH - 5}px;
    left: 0px;
  }
  .meetingLink {
    margin-left: 5px;
  }
`;

function processEvents(output) {
  // console.log({ output });
  const lines =
    output === undefined ? [] : output.split('\n').filter((item) => item);
  // console.log({ lines });
  const events = [];
  lines.forEach((line) => {
    const result = line_regex.exec(line);
    events.push({
      start_time_str: result[2].replace(/^0/, ''),
      start_time: convertStrTimeToDecimal(result[2]),
      end_time_str: result[4].replace(/^0/, ''),
      end_time: convertStrTimeToDecimal(result[4]),
      title: result[5],
      zoom_link: getLink(result[6] + ' ' + result[7], zoom_link_regex),
      gmeet_link: getLink(result[6] + ' ' + result[7], gmeet_link_regex),
      teams_link: getLink(result[6] + ' ' + result[7], teams_link_regex),
    });
  });
  return events;
}

function convertStrTimeToDecimal(str) {
  const result = str.split(':');
  return parseInt(result[0]) + parseInt(result[1]) / 60;
}

function getLink(str, regex) {
  const links = regex.exec(str);
  if (Array.isArray(links) && links.length > 1) {
    return [...new Set(links)];
  } else {
    return '';
  }
}

function changeOffset(offset, val, dispatch) {
  // console.log(`changing offset by ${val}`);
  dispatch({ type: 'LOADING' });
  dispatch({ type: 'CHANGE_OFFSET', offset: offset + val });
  getData(dispatch, offset + val);
}

function resetOffset(dispatch) {
  // console.log("resetting offset");
  dispatch({ type: 'LOADING' });
  dispatch({ type: 'CHANGE_OFFSET', offset: 0 });
  getData(dispatch, 0);
}

function Header({ date, offset, dispatch }) {
  const month_names = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  return (
    <div>
      <i
        class="fa fa-angles-left header buttonOffset buttonOffsetChange"
        onClick={() => changeOffset(offset, -1, dispatch)}
      />
      <div id="shown-date" class="header dateInHeader" data-offset={offset}>
        {`${date.getDate()}. ${
          month_names[date.getMonth()]
        } ${date.getFullYear()}`}
      </div>
      <i
        class="fa fa-angles-right header buttonOffset buttonOffsetChange"
        onClick={() => changeOffset(offset, 1, dispatch)}
      />
      <i
        class="fa fa-arrow-rotate-right header buttonOffset buttonOffsetReset"
        onClick={() => resetOffset(dispatch)}
      />
    </div>
  );
}

function Events({ date, offset, events }) {
  // console.log({ output });
  const current_time = date.getHours() + date.getMinutes() / 60;
  return (
    <div id="events">
      {events
        .sort((a, b) => a.start_time - b.start_time || a.end_time - b.end_time)
        .map((event) => {
          return (
            <Event
              key={event.title}
              offset={offset}
              event={event}
              current_time={current_time}
            />
          );
        })}
    </div>
  );
}

function Event({ event, offset, current_time }) {
  const border_thickness =
    offset > 0 || offset < 0
      ? 4
      : event.start_time <= current_time && event.end_time >= current_time
      ? 8
      : 4;
  const color =
    offset > 0
      ? '#FFF'
      : offset < 0 || current_time >= event.end_time
      ? '#808080'
      : current_time - event.start_time >= -0.5 &&
        current_time <= event.end_time
      ? '#e74c3c'
      : '#FFFFFF';
  return (
    <div
      key={event.title}
      class="event event-details"
      style={{ color: color, borderLeft: `solid ${border_thickness}px` }}
    >
      {event.start_time_str === '0:00' && event.end_time_str === '0:00'
        ? 'All-day'
        : `${event.start_time_str} - ${event.end_time_str}`}
      <Link label="zoom" values={event.zoom_link} color={color} />
      <Link label="gmeet" values={event.gmeet_link} color={color} />
      <Link label="teams" values={event.teams_link} color={color} />
      <br />
      {event.title}
    </div>
  );
}

function Loading() {
  return <div class="event">...loading...</div>;
}
function NoEvents() {
  return <span class="event">No events.</span>;
}

function Link({ label, values, color }) {
  return values === ''
    ? null
    : values.map((value) => (
        <a
          key={value}
          class="meetingLink"
          href={value}
          style={{ color: color }}
        >
          [{label}]
        </a>
      ));
}

export function render({ output, offset }, dispatch) {
  // console.log("rendering...");
  // console.log({ output });
  // console.log({ offset });
  const dateToShow = new Date();
  dateToShow.setDate(dateToShow.getDate() + offset);
  const events =
    output === '' || output === 'loading' ? [] : processEvents(output);
  return (
    <div id="calendar-widget">
      <link rel="stylesheet" href="/calendar/fontawesome.min.css"></link>
      <Header date={dateToShow} offset={offset} dispatch={dispatch} />
      {output === 'loading' ? (
        <Loading />
      ) : output === '' ? (
        <NoEvents />
      ) : (
        <Events date={dateToShow} offset={offset} events={events} />
      )}
    </div>
  );
}
