/* eslint-disable no-console */
import { Handler } from "aws-lambda"

const delay = process.env.DELAY ? parseInt(process.env.DELAY) * 1000 : 60000
console.log("delay", delay)

console.log("Handler init MODE ", process.env.MODE, "DELAY", delay)

/**
 * MODE drives the testing mode of the lambda function
 *
 * Possible values:
 *
 *   crash-init - throw error in module initalization
 *   crash-handler - throw error in handler
 *   delay - delay successful return
 */

const MODE = process.env.MODE
if (MODE === "crash-init") {
  throw new Error("Crash init")
}

// export const sqsHandler: Handler = async (event, context) => {
//   console.log("sqsHandler", JSON.stringify({ event, context }))
//   await new Promise((resolve) => setTimeout(resolve, 1000))
// }

export const snsHandler: Handler = async (event, context) => {
  console.log("snsHandler", JSON.stringify({ event, context }))

  switch (MODE) {
    case "crash-handler":
      throw new Error("Crash handler")
    case "delay":
      await new Promise((resolve) => setTimeout(resolve, delay))
  }
}
