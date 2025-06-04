const Caver = require("caver-js");
const { getKlaytnKmsEthers, getKlaytnKmsWeb3 } = require("../utils/awskms");

const main = async () => {
  const provider = getKlaytnKmsWeb3();
  // const account = await provider.getSigner().getAddress();
  // console.log("account : ", account);
  const account = await provider.eth.getAccounts();
  console.log("account : ", account[0]);
  // const caver = new Caver("https://public-en-kairos.node.kaia.io");
  const caver = new Caver(provider);

  // let sender = caver.klay.accounts.wallet.add("0xALICE_PRIV_KEY");
  // let payer = caver.klay.accounts.wallet.add("0xFRED_PRIV_KEY");

  // let { rawTransaction: senderRawTransaction } = await caver.klay.accounts.signTransaction({
  //   type: 'FEE_DELEGATED_VALUE_TRANSFER',
  //   from: sender.address,
  //   to: '0xBOB',
  //   gas: '3000000',
  //   value: caver.utils.toPeb('1', 'KLAY'),
  // }, sender.privateKey);

  try {
    console.log("!!!!!!!!!!!!!!!!!!!");
    let { rawTransaction: senderRawTransaction } =
      await caver.klay.signTransaction({
        type: "FEE_DELEGATED_VALUE_TRANSFER",
        from: account[0],
        to: "0xc88a8ddd9e56cc6a26404b6c412f2fcf290bde3d",
        gas: "3000000",
        value: caver.utils.toPeb("1", "KAIA"),
      });
    console.log("rawTransaction: ", senderRawTransaction);
  } catch (e) {
    console.log("e : ", e);
  }

  // Alice ---> Fred
  // : Alice somehow delivers raw tx to Fred

  // let { rawTransaction: finalTx } = await caver.klay.accounts.signTransaction(
  //   {
  //     senderRawTransaction: senderRawTransaction,
  //     feePayer: payer.address,
  //   },
  //   payer.privateKey,
  // );
  //
  // caver.klay.sendSignedTransaction(finalTx).then((err, receipt) => {
  //   console.log(receipt);
  // });
};

main();
