import { Context, Logger, Schema, segment } from 'koishi'
import { qrdecode } from './decoder'

export const name = 'qrdecode'

export interface Config { }

export const Config: Schema<Config> = Schema.object({})

const logger = new Logger('qrdecode')

export function apply(ctx: Context) {
  ctx.on('message', async (session) => {
    const code = segment.select(session.elements, 'img')[0]
    if (code == null) {
      return 
    }
    try {
      const decodeResult = await qrdecode(code.attrs.src)
      if(decodeResult.length === 0) {
        return
      }
      const result = decodeResult.reduce((acc, cur) => {
        acc += cur.content + '\n'
        return acc
      }, '图片识别结果：')
      session.send(result)
      return
    } catch (e) {
      logger.error(e)
    }
  })
}
