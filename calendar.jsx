// based on: https://github.com/knazarov/ubersicht-calendar-widget
// requires ical-buddy: brew install ical-buddy

// --------------- CUSTOMIZE ME ---------------
// the following dimensions are specified in pixels
const WIDTH = 250; // width of the widget
const TOP = 550; // top margin
const LEFT = 24; // left margin
const BOTTOM = 24; // bottom margin
const REFRESH_FREQUENCY = 60; // widget refresh frequency in seconds
const DEBUG_LOG = false;
// --------------------------------------------

import { run } from 'uebersicht';

export function command(dispatch) {
  DEBUG_LOG && console.log("called 'command'");
  getData(dispatch, undefined);
}

function getData(dispatch, offset) {
  if (offset === undefined) {
    const dateElement = document.getElementById('shown-date');
    offset = dateElement === null ? 0 : parseInt(dateElement.dataset.offset);
  }
  const offsetString = offset > 0 ? `+${offset}` : `${offset}`;
  // construct bash command to grab today's events
  // Refer to https://hasseg.org/icalBuddy/man.html
  const commandString = `/usr/local/bin/icalBuddy -ea -npn -nrd -nc -b '' -nnr ' ' -iep 'title,datetime,location,notes' -ps '||' -po 'datetime,title,location,notes' -tf '%H:%M' -df '%Y-%m-%d' eventsFrom:today${offsetString} to:today${offsetString}`;
  run(commandString).then((output) =>
    dispatch({ type: 'UB/COMMAND_RAN', output })
  );
}

export const initialState = {
  output: '',
  offset: 0,
};

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
    margin-bottom: 5px;
  }
  .date-header {
    font-size: 16px;
    font-weight: bold;
    margin-left: 8px;
    margin-right: 8px;
  }
  .button-offset {
    color: #A9A9A9;
    font-size: 12px;
    user-select: none;
  }
  .left-margin {
    margin-left: 5px;
  }
  .event {
    font-size: 12px;
  }
  .event-details {
    font-weight: bold;
    border-left: solid 4px;
    border-radius: 2px;
    padding-top: 2px;
    padding-bottom: 2px;
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

const line_regex =
  /^(\d+-\d+-\d+)?(?: at )?(\d+:\d+) - (\d+-\d+-\d+)?(?: at )?((?:\d+:\d+)|(?:\.\.\.))([^]*)?([^]*)?([^]*)?$/;
const zoom_link_regex = /(https:\/\/[a-z]{2,20}.zoom.[a-z]{2,3}\/j\/[^ >]*)/;
const gmeet_link_regex = /(https:\/\/meet\.google\.com\/[^ >]*)/;
const teams_link_regex =
  /(https:\/\/teams\.microsoft\.com\/l\/meetup-join\/[^ >]*)/;

function processEvents(output) {
  DEBUG_LOG && console.log({ output });
  const lines =
    output === undefined ? [] : output.split('\n').filter((item) => item);
  DEBUG_LOG && console.log({ lines });
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
  DEBUG_LOG && console.log(`changing offset by ${val}`);
  dispatch({ type: 'LOADING' });
  dispatch({ type: 'CHANGE_OFFSET', offset: offset + val });
  getData(dispatch, offset + val);
}

function resetOffset(dispatch) {
  DEBUG_LOG && console.log('resetting offset');
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
        class="fa fa-angles-left header button-offset button-offset-change"
        onClick={() => changeOffset(offset, -1, dispatch)}
      />
      <div id="shown-date" class="header date-header" data-offset={offset}>
        {`${date.getDate()}. ${
          month_names[date.getMonth()]
        } ${date.getFullYear()}`}
      </div>
      <i
        class="fa fa-angles-right header button-offset button-offset-change"
        onClick={() => changeOffset(offset, 1, dispatch)}
      />
      <i
        class="fa fa-arrow-rotate-right header button-offset left-margin"
        onClick={() => resetOffset(dispatch)}
      />
      <i
        class="fa fa-calendar-days header button-offset left-margin"
        onClick={() => run('open /System/Applications/Calendar.app')}
      />
    </div>
  );
}

function Events({ date, offset, events }) {
  DEBUG_LOG && console.log({ events });
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

export function render({ output, offset, show_events }, dispatch) {
  if (DEBUG_LOG) {
    console.log('rendering...');
    console.log({ output });
    console.log({ offset });
  }
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

export function updateState(event, previousState) {
  if (DEBUG_LOG) {
    console.log("called 'updateState'");
    console.log({ event });
  }
  if (event.type === 'UB/COMMAND_RAN' && event.output !== undefined) {
    if (DEBUG_LOG) {
      console.log("mode: 'UB/COMMAND_RAN'");
      console.log({ event });
    }
    return { ...previousState, output: event.output };
  } else if (event.type === 'CHANGE_OFFSET' && event.offset !== undefined) {
    if (DEBUG_LOG) {
      console.log("mode: 'CHANGE_OFFSET'");
      console.log({ event });
    }
    return { ...previousState, offset: event.offset };
  } else if (event.type === 'LOADING') {
    if (DEBUG_LOG) {
      console.log("mode: 'LOADING'");
      console.log({ event });
    }
    return { ...previousState, output: 'loading' };
  } else {
    DEBUG_LOG && console.log('returning previous state');
    return { ...previousState };
  }
}
