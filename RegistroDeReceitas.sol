pragma solidity ^0.8.20;

contract RegistroDeReceitas {
    struct Receita {
        address medico;
        uint256 data;
        bool validada;
    }
    address public immutable admin;

    mapping(address => bool) private medicos;
    mapping(bytes32 => Receita) private receitas;

    event MedicoCredenciado(address indexed medico);
    event MedicoDescredenciado(address indexed medico);
    event ReceitaEmitida(
        bytes32 indexed hash,
        address indexed medico,
        uint256 data
    );
    event ReceitaValida(
        bytes32 indexed hash,
        address indexed validator
    );


    modifier apenasAdmin(string memory mensagem) {
        require(msg.sender == admin,mensagem);
        _;
    }
    constructor() {
        admin = msg.sender;
    }

    function credenciar (address medico) 
    external 
    apenasAdmin("Apenas o admin pode credenciar medicos!!!!!!!.") 
    {
        medicos[medico] = true;
        emit MedicoCredenciado(medico);
    }

    function descredenciar (address medico) 

    external 
    apenasAdmin("Apenas o admin pode descredenciar medicos!!!!!!!.") {
        medicos[medico] = false;
        emit MedicoDescredenciado(medico);
    }

    function estaCredenciado(address medico) public view returns (bool) {
        return medicos[medico];
    }

    function emitir(bytes32 hash) external returns (bytes32) {
        require(estaCredenciado(msg.sender), "esse medico nao e credenciado!!!!!!!.");
        require(receitas[hash].medico == address(0), "essa receita ja esta registrada!!!!!!!.");

        receitas[hash] = Receita({
            medico: msg.sender,
            data: block.timestamp,
            validada: false
        });

        emit ReceitaEmitida(hash, msg.sender, block.timestamp);

        return hash;
    }

    function validar(bytes32 hash) external returns (address medico, uint256 data) {
        Receita storage receita = receitas[hash];

        require(receita.medico != address(0), "essa receita nao foi encontrada!!!!!!!.");
        require(!receita.validada, "essa receita ja foi utilizada!!!!!!!.");

        receita.validada = true;

        emit ReceitaValida(hash, msg.sender);

        return (receita.medico, receita.data);
    }
}


