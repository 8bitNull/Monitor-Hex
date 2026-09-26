// Dependency-free PNG export of the mobile blue/white H mark.
// Opaque square backgrounds let iOS/Android apply their own corner masks.
import {writeFileSync,mkdirSync} from 'node:fs'
import {resolve} from 'node:path'
import {deflateSync} from 'node:zlib'
const out=resolve(import.meta.dirname,'../public/icons')
mkdirSync(out,{recursive:true})
function crc32(data){let crc=0xffffffff;for(const byte of data){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0)}return (crc^0xffffffff)>>>0}
function chunk(name,data){const type=Buffer.from(name),length=Buffer.alloc(4),crc=Buffer.alloc(4);length.writeUInt32BE(data.length);crc.writeUInt32BE(crc32(Buffer.concat([type,data])));return Buffer.concat([length,type,data,crc])}
for(const size of [180,192,512]){
 const pixels=Buffer.alloc((size*3+1)*size)
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  let coverage=0
  for(let sy=0;sy<4;sy++)for(let sx=0;sx<4;sx++){
   const u=(x+(sx+.5)/4)/size,v=(y+(sy+.5)/4)/size
   if(v>=.25&&v<=.75&&((u>=.29&&u<=.38)||(u>=.62&&u<=.71)||(u>=.38&&u<=.62&&v>=.455&&v<=.545)))coverage++
  }
  const pos=y*(size*3+1)+1+x*3
  for(const [i,c] of [53,109,204].entries())pixels[pos+i]=Math.round(c+(255-c)*coverage/16)
 }
 const header=Buffer.alloc(13);header.writeUInt32BE(size);header.writeUInt32BE(size,4);header[8]=8;header[9]=2
 writeFileSync(resolve(out,`hex-home-${size}.png`),Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(pixels)),chunk('IEND',Buffer.alloc(0))]))
}
console.log('Home screen icons: 180, 192 and 512px')
