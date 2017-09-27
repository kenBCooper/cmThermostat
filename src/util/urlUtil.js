const MAX_SYSTEM_COUNT = 20;

// Looks for the currently active system based on the current url. must be between 0-19.
// uses the following pattern: genx.com/<SYSTEM_NUMBER>/anything/else/123
export const getCurrentSystemNumber = () => {
  const pathParts = window.location.pathname.split('/');
  const parsedSystemNumber = parseInt(pathParts[1], 10);

  // If the parsed system number from the url is not an integer between 0-19, return 0;
  if (![...Array(MAX_SYSTEM_COUNT).keys()].find((number) => number === parsedSystemNumber)) {
    return 0
  } else {
    return parsedSystemNumber;
  }
}