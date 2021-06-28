const https = require('https')
const fs = require('fs')

const PROJECT_LIST = require('./projectList.js')

// list of unique counts per project

let db = PROJECT_LIST.map(o=>{
    let countByAddr = analyze(o)
    return {
        contract: o.contract,
        name: o.name,
        total: Object.keys(countByAddr).length,
        countByAddr: countByAddr
    }
})

fs.writeFileSync('./data/db.json',JSON.stringify(db)) // relative to root folder when running from npm start

// generate index by account
// { account : [n,n,n,n] -- number per project }
// buffer allows for a new account to keep a list of previous projects with a '0'
buffer = []
let db_accounts = db.reduce((prev,curr)=>{

    // add a 0 count to existing accounts for the project
    Object.keys(prev).map(addr=>{
        prev[addr].push(0)
    })
    // Go through current list and add or increment counts from current project
    Object.keys(curr.countByAddr).map(addr=>{
        if(prev.hasOwnProperty(addr)){
            prev[addr].pop() // pop the 0 placeholder
            prev[addr].push(curr.countByAddr[addr])
        }else{
            // new entry
            prev[addr] = buffer.concat(curr.countByAddr[addr])
        }
    })

    // increment buffer for new accounts
    buffer.push(0)

    return prev
},{})

fs.writeFileSync('./data/db_accounts.json',JSON.stringify(db_accounts))
fs.writeFileSync('./data/db_accounts.js','const db_accounts = '+JSON.stringify(db_accounts))

console.log('TOTAL ACCOUNTS FOUND:',Object.keys(db_accounts).length,'\n\n')


function analyze(project){


    let rawAccounts = {
        lastBlock: 0,
        owners: []
    }

    let dataFile = `./data/data_${project.contract}.json`

    fs.appendFileSync(dataFile,'') // init the file if none

    let rawData = fs.readFileSync(dataFile)
    if(rawData.length > 0){
        rawAccounts = JSON.parse(rawData)
        console.log(`\nREAD ${rawAccounts.owners.length} RECORDS`)
    }

    function compressData(data){
        return data.owners.reduce( (prev,curr,i)=>{
            if(curr){
                prev[curr] = prev.hasOwnProperty(curr) ? prev[curr]+1 : 1    
            }
            return prev
        },{})
    }

    let uniqueCount = compressData(rawAccounts)
    console.log(`${project.name} [${project.contract}]:`,'UNIQUE OWNERS',Object.keys(uniqueCount).length,'\n')
    return uniqueCount
}