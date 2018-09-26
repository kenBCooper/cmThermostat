export const formatTemp = (tempInFarenheight, convertToCelsius) => {
	if (!convertToCelsius) return tempInFarenheight;
  return Math.round((tempInFarenheight -32) * (5/9));
};
