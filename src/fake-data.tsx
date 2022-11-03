import { random } from "lodash-es";

export const DATA_MAX = 100;
export const DATA_MIN = 0;

export const getRandomData = (n: number) => {
  const values = [];

  for (let i = 0; i < n; i++) {
    values.push(random(25, 75));
  }

  return values;
};

// export const getRandomData = (n: number) => {
//   const values = [];
//   const amplitude = 50;
//
//   for (let i = 0; i < n; i++) {
//     values.push(amplitude * Math.sin(i) + amplitude);
//   }
//
//   return values;
// };
