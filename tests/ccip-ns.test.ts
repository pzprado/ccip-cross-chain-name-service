import { ethers } from 'hardhat'
import { expect } from 'chai'
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers'

describe('Cross-Chain Name Service Test', function () {
  async function deploy () {
    // STEP 1: Deploy CCIPLocalSimulator
    const localSimulatorFactory = await ethers.getContractFactory(
      'CCIPLocalSimulator'
    )
    const localSimulator = await localSimulatorFactory.deploy()
    const config = await localSimulator.configuration()

    // STEP 2: Deploy the Lookup contract linked to Register
    const CrossChainNameServiceLookupFactory = await ethers.getContractFactory(
      'CrossChainNameServiceLookup'
    )
    const lookupRegisterContract =
      await CrossChainNameServiceLookupFactory.deploy()

    // STEP 3: Deploy the Register contract
    const CrossChainNameServiceRegisterFactory =
      await ethers.getContractFactory('CrossChainNameServiceRegister')
    const registerContract = await CrossChainNameServiceRegisterFactory.deploy(
      config.sourceRouter_,
      lookupRegisterContract.address
    )

    // STEP 4: Deploy the Lookup contract linked to Receiver
    const lookupReceiverContract =
      await CrossChainNameServiceLookupFactory.deploy()

    // STEP 5: Deploy the Receiver contract
    const CrossChainNameServiceReceiverFactory =
      await ethers.getContractFactory('CrossChainNameServiceReceiver')
    const receiverContract = await CrossChainNameServiceReceiverFactory.deploy(
      config.destinationRouter_,
      lookupReceiverContract.address,
      config.chainSelector_
    )

    // STEP 6: Enable the chain in the Register contract
    await registerContract.enableChain(
      config.chainSelector_,
      receiverContract.address,
      1000000
    )

    // STEP 7: Set Cross-Chain Name Service Addresses
    await lookupRegisterContract.setCrossChainNameServiceAddress(
      registerContract.address
    )
    await lookupReceiverContract.setCrossChainNameServiceAddress(
      receiverContract.address
    )

    const signers = await ethers.getSigners()
    const aliceSigner = signers[1]

    return {
      registerContract,
      lookupRegisterContract,
      lookupReceiverContract,
      aliceSigner
    }
  }

  it('should register and lookup a name across chains', async function () {
    const {
      registerContract,
      lookupRegisterContract,
      lookupReceiverContract,
      aliceSigner
    } = await loadFixture(deploy)

    // Register the name 'alice.ccns' with Alice’s address
    await registerContract.connect(aliceSigner).register('alice.ccns')

    // Lookup the name 'alice.ccns' from the Register Lookup contract
    const lookedUpAddressFromRegister = await lookupRegisterContract.lookup(
      'alice.ccns'
    )
    expect(lookedUpAddressFromRegister).to.equal(aliceSigner.address)

    // Lookup the name 'alice.ccns' from the Receiver Lookup contract
    const lookedUpAddressFromReceiver = await lookupReceiverContract.lookup(
      'alice.ccns'
    )
    expect(lookedUpAddressFromReceiver).to.equal(aliceSigner.address)
  })
})
