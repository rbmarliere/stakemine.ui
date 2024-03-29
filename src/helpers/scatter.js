import { login, logout, showError } from "./actions";
import { Api, JsonRpc } from "eosjs";
import ScatterJS from "scatterjs-core";

//export const rpc = new JsonRpc( "http://10.197.70.202:8888" );
export const rpc = new JsonRpc("https://api-kylin.eoslaomao.com");

const stakemine = "stakemine112";

const network = ScatterJS.Network.fromJson({
    blockchain: "eos",
    chainId: "aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906",
    host: "https://api-kylin.eoslaomao.com",
    port: 443,
    protocol: "http"
});

const handleError = (dispatch, err) => {
    var msg = typeof err !== "string" ? err.message : err;
    if (msg === "Cannot read property 'identity' of null")
        msg = "Please login first";
    dispatch(showError(msg));
};

export const scatterLogin = dispatch => {
    ScatterJS.scatter
        .connect(
            "eosio",
            { initTimeout: 2000 }
        )
        .then(connected => {
            if (!connected) {
                dispatch(logout());
                dispatch(showError("Couldn't connect to Scatter"));
                return false;
            }

            const scatter = ScatterJS.scatter,
                requiredFields = { accounts: [network] };

            scatter
                .getIdentity(requiredFields)
                .then(() => {
                    dispatch(login(scatter));
                })
                .catch(error => {
                    if (error.type === "identity_rejected") {
                        dispatch(logout());
                        dispatch(showError("User rejected identity request"));
                    }
                });

            window.ScatterJS = null;
        });
};

export const scatterLogout = dispatch => {
    ScatterJS.scatter.connect("eosio").then(() => {
        ScatterJS.scatter.forgetIdentity();
    });
    dispatch(logout());
};

export const scatterStake = (
    dispatch,
    scatter,
    contract,
    cpu_quantity,
    net_quantity
) => {
    try {
        const account = scatter.identity.accounts.find(
            x => x.blockchain === "eos"
        ).name;
        const eos = scatter.eos(network, Api, { rpc });

        eos.transact(
            {
                actions: [
                    {
                        account: "eosio",
                        name: "delegatebw",
                        authorization: [
                            {
                                actor: account,
                                permission: "active"
                            }
                        ],
                        data: {
                            from: account,
                            receiver: contract,
                            stake_net_quantity: net_quantity,
                            stake_cpu_quantity: cpu_quantity,
                            transfer: false
                        }
                    },
                    {
                        account: stakemine,
                        name: "stake",
                        authorization: [
                            {
                                actor: account,
                                permission: "active"
                            }
                        ],
                        data: {
                            contract: contract,
                            holder: account
                        }
                    }
                ]
            },
            {
                blocksBehind: 5,
                expireSeconds: 30
            }
        ).catch(err => {
            dispatch(showError(err.message));
        });
    } catch (err) {
        handleError(dispatch, err);
    }
};

export const scatterUnstake = async (dispatch, scatter, contract) => {
    try {
        const account = scatter.identity.accounts.find(
            x => x.blockchain === "eos"
        ).name;
        const eos = scatter.eos(network, Api, { rpc });
        const deleg = await rpc.get_table_rows({
            code: "eosio",
            scope: account,
            table: "delband",
            lower_bound: contract
        });

        if (deleg.rows.length === 0) {
            dispatch(showError("You are not staking for this project."));
            return;
        }

        const cpu_quantity = deleg.rows[0].cpu_weight;
        const net_quantity = deleg.rows[0].net_weight;

        eos.transact(
            {
                actions: [
                    {
                        account: "eosio",
                        name: "undelegatebw",
                        authorization: [
                            {
                                actor: account,
                                permission: "active"
                            }
                        ],
                        data: {
                            from: account,
                            receiver: contract,
                            unstake_net_quantity: net_quantity,
                            unstake_cpu_quantity: cpu_quantity,
                            transfer: false
                        }
                    },
                    {
                        account: stakemine,
                        name: "unstake",
                        authorization: [
                            {
                                actor: account,
                                permission: "active"
                            }
                        ],
                        data: {
                            contract: contract,
                            holder: account
                        }
                    }
                ]
            },
            {
                blocksBehind: 5,
                expireSeconds: 30
            }
        ).catch(err => {
            dispatch(showError(err.message));
        });
    } catch (err) {
        handleError(dispatch, err);
    }
};

export const scatterClaim = (dispatch, scatter, contract) => {
    try {
        const account = scatter.identity.accounts.find(
            x => x.blockchain === "eos"
        ).name;
        const eos = scatter.eos(network, Api, { rpc });
        eos.transact(
            {
                actions: [
                    {
                        account: contract,
                        name: "claim",
                        authorization: [
                            {
                                actor: account,
                                permission: "active"
                            }
                        ],
                        data: {
                            holder: account
                        }
                    }
                ]
            },
            {
                blocksBehind: 5,
                expireSeconds: 30
            }
        ).catch(err => {
            dispatch(showError(err.message));
        });
    } catch (err) {
        handleError(dispatch, err);
    }
};
