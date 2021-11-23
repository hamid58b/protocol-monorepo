// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
//isse an NFT

const hre = require("hardhat");
require("dotenv");
const Web3 = require("web3");
const ethers = require("ethers");

const hostAddress = '0xF0d7d1D47109bA426B9D8A3Cde1941327af1eea3';
const cfaAddress = '0xECa8056809e7e8db04A8fF6e4E82cD889a46FE2F';
const fDAIx = '0xe3CB950Cb164a31C66e32c320A800D477019DCFF';

//all addresses hardcoded for kovan
const hostJSON = require("../artifacts/@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperfluid.sol/ISuperfluid.json")
const hostABI = hostJSON.abi;

const cfaJSON = require("../artifacts/@superfluid-finance/ethereum-contracts/contracts/interfaces/agreements/IConstantFlowAgreementV1.sol/IConstantFlowAgreementV1.json")
const cfaABI = cfaJSON.abi;

const budgetNFTJSON = require("../artifacts/contracts/BudgetNFT.sol/BudgetNFT.json");
const budgetNFTABI = budgetNFTJSON.abi; 

//temporarily hardcode contract address and sender address
//need to manually enter contract address and sender address here
const deployedBudgetNFT = require("../deployments/kovan/BudgetNFT.json");
const budgetNFTAddress = deployedBudgetNFT.address;


//TODO: address of owner of option here..need to change this
const _receiver = "0x5966aa11c794893774a382d9a19743B8be6BFFd1";
const _sender = "0x9421FE8eCcAfad76C3A9Ec8f9779fAfA05A836B3";
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // 0x5FbDB2315678afecb367f032d93F642f64180aa3
  const web3 = new Web3(new Web3.providers.HttpProvider(process.env.ALCHEMY_URL));
  const budgetNFT = await new web3.eth.Contract(budgetNFTABI, budgetNFTAddress);
  const nonce = await web3.eth.getTransactionCount(_sender, 'latest'); // nonce starts counting from 0


  const txData = (await budgetNFT.methods.issueNFT(_receiver, "580246913")).encodeABI() //~100 per mo

  //send the tx to the contract
  // this is from Alchemy
  let tx = {
    'to': budgetNFTAddress,
    'gas': 3000000,
    'nonce': nonce,
    'data': txData
  }

  let signedTx = await web3.eth.accounts.signTransaction(tx, process.env.PK);

  await web3.eth.sendSignedTransaction(signedTx.rawTransaction, function(error, hash) {
    if (!error) {
      console.log("🎉 The hash of your transaction is: ", hash, "\n Check Alchemy's Mempool to view the status of your transaction!");
    } else {
      console.log("❗Something went wrong while submitting your transaction:", error)
    }
   });


}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });