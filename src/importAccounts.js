//
// KAI TURNER - 2021
//
const https = require('https')
const fs = require('fs')

// API_KEY - File not included on GitHub
// Create your file 'apiKey.js' with the Etherscan API key with the following:
// module.exports = '....' // YOUR API KEY HERE
const API_KEY = require('./apiKey.js')

let PROJECT_LIST = require('./projectList.js')
//const CONTRACT_ADDR = CONTRACT_LIST[CONTRACT_LIST.length-1].contract

// IMPORT ALL ON THE LIST - serialized
function start(){
    if(PROJECT_LIST.length > 0){
        let project = PROJECT_LIST.shift()
        importByContractAddress(project,start)
    }
}

// Loop until project list queue is finished
start()

function importByContractAddress(project,callback){

    let rawAccounts = {
        lastBlock: 0,
        owners: []
    }

    let dataFile = `./data/data_${project.contract}.json` // relative to root folder when running from npm start

    fs.appendFileSync(dataFile,'') // init the file if none exists

    let rawData = fs.readFileSync(dataFile)
    if(rawData.length > 0){
        rawAccounts = JSON.parse(rawData)
        console.log(`\nREAD ${rawAccounts.owners.length} RECORDS\n`)
    }

    const url = 'https://api.etherscan.io/api'

    runImport()

    let count = 0
    async function runImport(){

        let query = {
            module: 'logs',
            action: 'getLogs',
            fromBlock: rawAccounts.lastBlock, // could +1 but might miss large transactions on a single block
            //fromBlock: 999999999,
            toBlock: 'latest',
            address: project.contract, // TOKEN CONTRACT ADDR
            topic0: '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
            apikey: API_KEY
        }
        const endpoint = `${url}?${Object.keys(query).map(o=>`${o}=${query[o]}`).join('&')}`
        console.log(endpoint)

        let data = await fetch(endpoint)
        rawAccounts = processData(data)

        fs.writeFileSync( dataFile, JSON.stringify(rawAccounts) )

        if(data.result.length < 100){
            // Assume if api returns fewer than 100 records, we're done
            console.log('\nTHIS IS THE FINAL RECORD')
            console.log(`\n${project.name}: IMPORT ACCOUNTS DONE\nTOKENS:${rawAccounts.owners.length}\n\n`)
            callback()
        }else{
            count++
            console.log(`\n${project.name}: ITERATION ${count}\tTOKENS:${rawAccounts.owners.length}\n`)
            setTimeout(runImport,1000)
        }       
    }

    function processData(data){

        let lastBlock = rawAccounts.lastBlock
        let owners = rawAccounts.owners
    
        data.result.map(o=>{
            let fromAddr = `0x${o.topics[1].substr(-40)}`
            let toAddr = `0x${o.topics[2].substr(-40)}`
            let value = parseInt(o.topics[3])
            let block = parseInt(o.blockNumber)
            lastBlock = lastBlock < block ? block : lastBlock
            console.log(`At block [${block}]: \tfrom ${fromAddr} \tto ${toAddr} \tID ${value}`)
            owners[value] = toAddr
        })
        //console.log(owners)
        return {
            lastBlock: lastBlock,
            owners: owners
        }
    }
}


function fetch(url){

    return new Promise((resolve,reject)=>{
        https.get(url,(res) => {
            let body = ""
    
            res.on("data", (chunk) => {
                body += chunk
            });
    
            res.on("end", () => {
                try {
                        let obj = body[0] === '{' ? JSON.parse(body) : null
                        resolve(obj)
    
                } catch (error) {
                    console.error(error.message)
                    reject(error)
                }
            })
    
        }).on("error", (error) => {
            console.error(error.message)
            reject(error)
        })
    }) 
}
