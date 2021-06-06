import React from 'react'
import { Link } from 'react-router-dom'

function Card({ ...props }) {
    return (
        <div className="flex flex-row flex-wrap py-10 justify-center">
            <div className="shadow-md rounded">
                <div className="p-4 flex flex-col sm:flex-row">
                    <div className="w-full sm:w-1/2 sm:border-r border-grey-light p-2">
                        <div className="flex justify-center">
                            <div className="p-2 bg-grey-lightest rounded-full">
                                <div className="bg-grey-lighter p-4 rounded-full">
                                    <h1 className="text-teal text-5xl text-center">
                                        SHA256 Encoder
          </h1>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col items-center mt-6 h-auto pt-2 xl:mt-16 lg:mt-16 md:mt-16">
                            <div>
                                <h2 className="text-grey-dark">Unlimited Encoding</h2>
                            </div>
                            <div className="flex flex-col items-center mt-4 w-full px-6 text-teal">
                                <div className="border-t border-b border-grey-lighter py-2 w-full text-center">
                                    <p>256 bit long</p>
                                </div>
                                <div className="border-t border-b border-grey-lighter py-2 w-full text-center">
                                    <p>Encrypt in Linear Time</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-center mt-4 text-teal">
                            <Link to="/encode">
                                <button className="flex items-center shadow px-4 py-2 text-white bg-black hover:bg-blue-300">
                                    Encode
  </button>
                            </Link>
                        </div>
                    </div>

                    <div className="w-full sm:w-1/2 border-grey-light p-2 mt-8 sm:mt-0">
                        <div className="flex justify-center">
                            <div className="p-2 bg-grey-lightest rounded-full">
                                <div className="bg-grey-lighter p-4 rounded-full">
                                    <h1 className="text-teal text-5xl  text-center">
                                        SHA256 Decoder
          </h1>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col items-center mt-6">
                            <div>
                                <h2 className="text-grey-dark">400 API Calls Per Day</h2>
                            </div>
                            <div className="flex flex-col items-center mt-4 w-full px-6 text-teal">
                                <div className="border-t border-b border-grey-lighter py-2 w-full text-center">
                                    <p>Output Length Varies</p>
                                </div>
                                <div className="border-t border-b border-grey-lighter py-2 w-full text-center">
                                    <p>Computationally Difficult</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-center mt-4 text-teal">
                            <Link to="/decode">
                                <button className="flex items-center shadow px-4 py-2 text-white bg-black hover:bg-blue-300">
                                    Decode
  </button>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    )
}

export default Card
