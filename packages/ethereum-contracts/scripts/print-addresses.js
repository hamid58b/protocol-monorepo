const getConfig = require("./getConfig");
const fs = require("fs");
const SuperfluidSDK = require("@superfluid-finance/js-sdk");
const {
    detectTruffleAndConfigure,
    parseColonArgs,
    getCodeAddress,
    extractWeb3Options,
} = require("./utils");

/**
 * @dev Inspect accounts and their agreements
 * @param {Array} argv Overriding command line arguments
 * @param {boolean} options.isTruffle Whether the script is used within native truffle framework
 * @param {Web3} options.web3  Injected web3 instance
 * @param {Address} options.from Address to deploy contracts from
 *
 * Usage: npx truffle exec scripts/print-addresses.js : output_file
 */
module.exports = async function (callback, argv, options = {}) {
    let output = "";
    try {
        await eval(`(${detectTruffleAndConfigure.toString()})(options)`);

        const args = parseColonArgs(argv || process.argv);
        if (args.length != 1) {
            throw new Error("Not enough arguments");
        }
        const outputFilename = args.shift();

        const networkId = await web3.eth.net.getId();
        console.log("network ID: ", networkId);
        const config = getConfig(networkId);

        const sf = new SuperfluidSDK.Framework({
            ...extractWeb3Options(options),
            version: process.env.RELEASE_VERSION || "test",
            tokens: config.tokenList,
            loadSuperNativeToken: true,
            additionalContracts: ["UUPSProxiable"],
        });
        await sf.initialize();

        const { UUPSProxiable, ISuperTokenFactory } = sf.contracts;

        output += `NETWORK_ID=${networkId}\n`;
        output += `SUPERFLUID_HOST_PROXY=${sf.host.address}\n`;
        output += `SUPERFLUID_HOST_LOGIC=${await getCodeAddress(
            UUPSProxiable,
            sf.host.address
        )}\n`;
        output += `SUPERFLUID_GOVERNANCE=${await sf.host.getGovernance()}\n`;
        output += `SUPERFLUID_SUPER_TOKEN_FACTORY_PROXY=${await sf.host.getSuperTokenFactory()}\n`;
        output += `SUPERFLUID_SUPER_TOKEN_FACTORY_LOGIC=${await sf.host.getSuperTokenFactoryLogic()}\n`;
        output += `CFA_PROXY=${sf.agreements.cfa.address}\n`;
        output += `CFA_LOGIC=${await getCodeAddress(
            UUPSProxiable,
            sf.agreements.cfa.address
        )}\n`;
        output += `IDA_PROXY=${sf.agreements.ida.address}\n`;
        output += `SLOTS_BITMAP_LIBRARY_ADDRESS=${
            "0x" +
            (
                await web3.eth.call({
                    to: sf.agreements.ida.address,
                    data: "0x3fd4176a", //SLOTS_BITMAP_LIBRARY_ADDRESS()
                })
            ).slice(-40)
        }\n`;
        output += `IDA_LOGIC=${await getCodeAddress(
            UUPSProxiable,
            sf.agreements.ida.address
        )}\n`;
        output += `SUPERFLUID_SUPER_TOKEN_LOGIC=${await (
            await ISuperTokenFactory.at(await sf.host.getSuperTokenFactory())
        ).getSuperTokenLogic()}\n`;
        await Promise.all(
            config.tokenList.map(async (tokenName) => {
                output += `SUPER_TOKEN_${tokenName.toUpperCase()}=${
                    sf.tokens[tokenName].address
                }\n`;
                const underlyingTokenSymbol = await sf.tokens[
                    tokenName
                ].underlyingToken.symbol.call();
                output += `NON_SUPER_TOKEN_${underlyingTokenSymbol.toUpperCase()}=${
                    sf.tokens[tokenName].underlyingToken.address
                }\n`;
            })
        );
        if (sf.config.nativeTokenSymbol) {
            output += `SUPER_TOKEN_${sf.config.nativeTokenSymbol.toUpperCase()}X=${
                sf.tokens[sf.config.nativeTokenSymbol + "x"].address
            }\n`;
        }

        fs.writeFile(outputFilename, output, callback);
    } catch (err) {
        console.log("Output so far:\n", output);
        callback(err);
    }
};
