/**
 *                          Blockchain Class
 *  The Blockchain class contain the basics functions to create your own private blockchain
 *  It uses libraries like `crypto-js` to create the hashes for each block and `bitcoinjs-message` 
 *  to verify a message signature. The chain is stored in the array
 *  `this.chain = [];`. Of course each time you run the application the chain will be empty because and array
 *  isn't a persisten storage method.
 *  
 */

const SHA256 = require('crypto-js/sha256');
const BlockClass = require('./block.js');
const bitcoinMessage = require('bitcoinjs-message');
const hex2ascii = require('hex2ascii');

class Blockchain {

    /**
     * Constructor of the class, you will need to setup your chain array and the height
     * of your chain (the length of your chain array).
     * Also everytime you create a Blockchain class you will need to initialized the chain creating
     * the Genesis Block.
     * The methods in this class will always return a Promise to allow client applications or
     * other backends to call asynchronous functions.
     */
    constructor() {
        this.chain = [];
        this.height = -1;
        this.initializeChain();
    }

    /**
     * This method will check for the height of the chain and if there isn't a Genesis Block it will create it.
     * You should use the `addBlock(block)` to create the Genesis Block
     * Passing as a data `{data: 'Genesis Block'}`
     */
    async initializeChain() {
        if( this.height === -1){
            let block = new BlockClass.Block({data: 'Genesis Block'});
            await this._addBlock(block);
        }
    }

    /**
     * Utility method that return a Promise that will resolve with the height of the chain
     */
    getChainHeight() {
        return new Promise((resolve, reject) => {
            resolve(this.height);
        });
    }

    /**
     * _addBlock(block) will store a block in the chain
     * @param {*} block 
     * The method will return a Promise that will resolve with the block added
     * or reject if an error happen during the execution.
     * You will need to check for the height to assign the `previousBlockHash`,
     * assign the `timestamp` and the correct `height`...At the end you need to 
     * create the `block hash` and push the block into the chain array. Don't for get 
     * to update the `this.height`
     * Note: the symbol `_` in the method name indicates in the javascript convention 
     * that this method is a private method. 
     */
    _addBlock(block) {
        let self = this;
        return new Promise(async (resolve, reject) => {
            if (self.chain.length>0) {
                // previous block hash
                block.previousBlockHash = self.chain[self.chain.length-1].hash;
            }

            block.hash = SHA256(JSON.stringify(block)).toString();

            block.height = self.chain.length;
            block.time = new Date().getTime().toString().slice(0,-3);
    
            console.log(JSON.stringify(block.hash));

            let isSuccess = block.hash && (block.hash.length === 64) && (block.height === self.chain.length); 

            isSuccess ? resolve(block) : reject(new Error('Cannot add invalid block.'));
        }).catch(e => console.log(e.toString))
        .then(block => {
            
            this.chain.push(block);
            this.height = this.chain.length + 1;
            return block;
        });
    }

    /**
     * The requestMessageOwnershipVerification(address) method
     * will allow you  to request a message that you will use to
     * sign it with your Bitcoin Wallet (Electrum or Bitcoin Core)
     * This is the first step before submit your Block.
     * The method return a Promise that will resolve with the message to be signed
     * @param {*} address 
     */
    requestMessageOwnershipVerification(address) {
        return new Promise((resolve) => {
            let message = `${address}:${new Date().getTime().toString().slice(0,-3)}:starRegistry`;
            resolve(message);
        });
    }

    /**
     * The submitStar(address, message, signature, star) method
     * will allow users to register a new Block with the star object
     * into the chain. This method will resolve with the Block added or
     * reject with an error.
     * Algorithm steps:
     * 1. Get the time from the message sent as a parameter example: `parseInt(message.split(':')[1])`
     * 2. Get the current time: `let currentTime = parseInt(new Date().getTime().toString().slice(0, -3));`
     * 3. Check if the time elapsed is less than 5 minutes
     * 4. Veify the message with wallet address and signature: `bitcoinMessage.verify(message, address, signature)`
     * 5. Create the block and add it to the chain
     * 6. Resolve with the block added.
     * @param {*} address 
     * @param {*} message 
     * @param {*} signature 
     * @param {*} star 
     */
    submitStar(address, message, signature, star) {
        let self = this;
        return new Promise(async (resolve, reject) => {
            // * 1. Get the time from the message sent as a parameter example: `parseInt(message.split(':')[1])`
            let time = parseInt(message.split(':')[1]);

            // * 2. Get the current time: `let currentTime = parseInt(new Date().getTime().toString().slice(0, -3));`
            let currentTime = parseInt(new Date().getTime().toString().slice(0, -3));

            console.log(currentTime - time);

            // * 3. Check if the time elapsed is less than 5 minutes
            let isElapsed5minutes = currentTime - time < 5*60;
            
            if (!isElapsed5minutes) {
                return;
            }

            // * 4. Veify the message with wallet address and signature: `bitcoinMessage.verify(message, address, signature)`
            let isVerified　= bitcoinMessage.verify(message, address, signature);
            if (!isVerified) {
                reject(new Error("Failed to verify message."));
            }

            // * 5. Create the block and add it to the chain
            let block = new BlockClass.Block({ star: star, owner: address });
            
            // * 6. Resolve with the block added.
            block = await this._addBlock(block);

            block.owner = address;
            resolve(block)
        }).catch(error => console.log("---submitStar: ", error)) ;
    }

    /**
     * This method will return a Promise that will resolve with the Block
     *  with the hash passed as a parameter.
     * Search on the chain array for the block that has the hash.
     * @param {*} hash 
     */
    getBlockByHash(hash) {
        let self = this;
        return new Promise((resolve, reject) => {
            let block = self.chain.filter(p => p.hash === hash)[0];
            
            resolve(block);
        });
    }

    /**
     * This method will return a Promise that will resolve with the Block object 
     * with the height equal to the parameter `height`
     * @param {*} height 
     */
    getBlockByHeight(height) {
        let self = this;
        return new Promise((resolve, reject) => {
            let block = self.chain.filter(p => p.height === height)[0];
            if(block){
                resolve(block);
            } else {
                resolve(null);
            }
        });
    }

    /**
     * This method will return a Promise that will resolve with an array of Stars objects existing in the chain 
     * and are belongs to the owner with the wallet address passed as parameter.
     * Remember the star should be returned decoded.
     * @param {*} address 
     */
    getStarsByWalletAddress (address) {
        let self = this;
        console.log("---getStarsByWalletAddress: ", self.chain.length);
        return new Promise((resolve, reject) => {
            let blocks = self.chain.filter(p => p.owner == address);
            if (blocks.length == 0) {
                console.log("---getStarsByWalletAddress: not found");    
                resolve([]);
            }  
            let stars = blocks.map(block => JSON.parse(hex2ascii(block.body)));
            stars != null ? resolve(stars) : new Error("failed to parse stars");
        });
    }

    /**
     * This method will return a Promise that will resolve with the list of errors when validating the chain.
     * Steps to validate:
     * 1. You should validate each block using `validateBlock`
     * 2. Each Block should check the with the previousBlockHash
     */
    validateChain() {
        let self = this;
        let errorLog = [];
        return new Promise(async (resolve, reject) => {
            
            self.chain.map(async function (block) {
                let validate = await block.validate();
                if (validate) {
                    if (block.height > 0) {
                        let previousBlockHash = self.chain[block.height - 1].hash;         
                        if (block.previousBlockHash == previousBlockHash) {
                            // ok
                        } else {
                            errorLog.push(new Error("Hash of the previous Block does not match the value of previousBlockHash"));
                        }
                    } else {
                        // genesis block
                    }
                } else {
                    errorLog.push(new Error("not validated"));
                }
            });
            resolve(errorLog);
        });
    }

}

module.exports.Blockchain = Blockchain;   